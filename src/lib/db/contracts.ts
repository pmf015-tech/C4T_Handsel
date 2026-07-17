import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";

import {
  canSignContract,
  hasAllPartySignatures,
  nextContractVersion,
  type ContractPartyRole,
} from "@/domain/contract/contract";
import {
  TermSheetContentSchema,
  type TermSheetContent,
} from "@/lib/terms/term-sheet";
import { ShareTokenSchema } from "@/lib/terms/share-token";

const ContractVersionRowSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  sourceTermSheetVersionId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  contentHash: z.string().length(64),
  content: TermSheetContentSchema,
  signingExpiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type ContractVersion = Readonly<
  z.infer<typeof ContractVersionRowSchema>
>;
export type ContractSignature = Readonly<{
  readonly partyRole: ContractPartyRole;
  readonly clerkUserId: string;
  readonly contentHash: string;
  readonly signedAt: Date;
}>;
export type ContractView = Readonly<{
  readonly version: ContractVersion;
  readonly signatures: readonly ContractSignature[];
  readonly events: readonly Readonly<Record<string, unknown>>[];
}>;

export class ContractNotFoundError extends Error {
  readonly name = "ContractNotFoundError";
  constructor() {
    super("Contract not found for this party.");
  }
}

export class RedlineHashUnchangedError extends Error {
  readonly name = "RedlineHashUnchangedError";
  constructor() {
    super("A redline must change the contract terms.");
  }
}

export class ContractInviteNotFoundError extends Error {
  readonly name = "ContractInviteNotFoundError";
  constructor() {
    super("Contract invite is invalid or expired.");
  }
}

export class ContractInviteRoleConflictError extends Error {
  readonly name = "ContractInviteRoleConflictError";
  constructor() {
    super("This deal already has a different brand party.");
  }
}

function parseContractVersion(row: unknown): ContractVersion {
  return ContractVersionRowSchema.parse(row);
}

function contentHash(content: TermSheetContent): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

async function findPartyRole(
  sql: Sql | TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<ContractPartyRole | null> {
  const rows = await sql<{ role: ContractPartyRole }[]>`
    select role from deal_parties
    where deal_id = ${dealId} and clerk_user_id = ${clerkUserId}
    limit 1
  `;
  return rows[0]?.role ?? null;
}

async function findLatestVersion(
  sql: Sql | TransactionSql,
  dealId: string,
): Promise<ContractVersion | null> {
  const rows = await sql`
    select id, deal_id as "dealId", source_term_sheet_version_id as "sourceTermSheetVersionId",
      version_number as "versionNumber", content_hash as "contentHash", content,
      signing_expires_at as "signingExpiresAt", created_at as "createdAt"
    from contract_versions where deal_id = ${dealId}
    order by version_number desc limit 1
  `;
  return rows[0] ? parseContractVersion(rows[0]) : null;
}

async function readContractView(
  sql: Sql | TransactionSql,
  dealId: string,
): Promise<ContractView | null> {
  const version = await findLatestVersion(sql, dealId);
  if (!version) return null;
  const signatures = await sql<ContractSignature[]>`
    select party_role as "partyRole", clerk_user_id as "clerkUserId",
      content_hash as "contentHash", signed_at as "signedAt"
    from contract_signatures where contract_version_id = ${version.id}
    order by signed_at asc
  `;
  const events = await sql<Readonly<Record<string, unknown>>[]>`
    select event_type as "eventType", actor_clerk_user_id as "actorClerkUserId",
      payload, created_at as "createdAt"
    from deal_events where deal_id = ${dealId}
      and event_type in ('CONTRACT_VERSION_CREATED', 'CONTRACT_SIGNATURE_CREATED', 'DEAL_FULLY_SIGNED', 'CONTRACT_SIGNATURES_RESET')
    order by created_at asc
  `;
  return { version, signatures, events };
}

export async function createContractVersion(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
): Promise<ContractView | null> {
  return sql.begin(async (transaction) => {
    const role = await findPartyRole(transaction, dealId, clerkUserId);
    if (!role) return null;
    const existing = await findLatestVersion(transaction, dealId);
    if (existing) return readContractView(transaction, dealId);
    const termSheets = await transaction`
      select id, content from term_sheet_versions
      where deal_id = ${dealId} order by version_number desc limit 1
    `;
    const termSheet = termSheets[0];
    if (!termSheet) return null;
    const content = TermSheetContentSchema.parse(termSheet.content);
    const versionId = randomUUID();
    const versionRows = await transaction`
      insert into contract_versions (
        id, deal_id, source_term_sheet_version_id, version_number, content_hash,
        content, signing_expires_at, created_by_clerk_user_id
      ) values (
        ${versionId}, ${dealId}, ${termSheet.id}, 1, ${contentHash(content)},
        ${transaction.json(content)}, ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}, ${clerkUserId}
      ) returning id, deal_id as "dealId", source_term_sheet_version_id as "sourceTermSheetVersionId",
        version_number as "versionNumber", content_hash as "contentHash", content,
        signing_expires_at as "signingExpiresAt", created_at as "createdAt"
    `;
    await transaction`
      update deals set state = 'NEGOTIATING', updated_at = now()
      where id = ${dealId} and state = 'DRAFT'
    `;
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${dealId}, 'CONTRACT_VERSION_CREATED', ${clerkUserId},
        ${transaction.json({ versionNumber: 1, contentHash: contentHash(content) })})
    `;
    return readContractView(transaction, dealId);
  });
}

export async function findContractForParty(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
): Promise<ContractView | null> {
  const role = await findPartyRole(sql, dealId, clerkUserId);
  return role ? readContractView(sql, dealId) : null;
}

export async function signContract(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
  expectedHash: string,
  now = new Date(),
): Promise<ContractView> {
  return sql.begin(async (transaction) => {
    const role = await findPartyRole(transaction, dealId, clerkUserId);
    const current = await readContractView(transaction, dealId);
    if (!role || !current) throw new ContractNotFoundError();
    canSignContract(
      current.version.contentHash,
      expectedHash,
      now,
      current.version.signingExpiresAt,
    );
    const insertedSignatures = await transaction`
      insert into contract_signatures (id, contract_version_id, deal_id, clerk_user_id, party_role, content_hash, signed_at)
      values (${randomUUID()}, ${current.version.id}, ${dealId}, ${clerkUserId}, ${role}, ${current.version.contentHash}, ${now})
      on conflict (contract_version_id, party_role) do nothing
      returning id
    `;
    if (insertedSignatures.length === 1) {
      await transaction`
        insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
        values (${randomUUID()}, ${dealId}, 'CONTRACT_SIGNATURE_CREATED', ${clerkUserId},
          ${transaction.json({ versionNumber: current.version.versionNumber, contentHash: current.version.contentHash, partyRole: role })})
      `;
    }
    const updated = await readContractView(transaction, dealId);
    if (!updated) throw new ContractNotFoundError();
    if (
      hasAllPartySignatures(updated.signatures, updated.version.contentHash)
    ) {
      await transaction`update deals set state = 'SIGNED', updated_at = now() where id = ${dealId}`;
      await transaction`
        insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
        values (${randomUUID()}, ${dealId}, 'DEAL_FULLY_SIGNED', ${clerkUserId}, ${transaction.json({ versionNumber: current.version.versionNumber })})
      `;
    }
    return readContractView(transaction, dealId) as Promise<ContractView>;
  });
}

/**
 * Redline body without its own transaction, so a caller that must revise terms
 * and reset signatures together (see reviseDealTerms) can run both in one
 * transaction. A signed contract must never be observable alongside terms it
 * no longer matches.
 */
export async function redlineContractInTransaction(
  transaction: TransactionSql,
  dealId: string,
  clerkUserId: string,
  termSheetVersionId: string,
): Promise<ContractView> {
  {
    const role = await findPartyRole(transaction, dealId, clerkUserId);
    const current = await readContractView(transaction, dealId);
    if (!role || !current) throw new ContractNotFoundError();
    const termSheets =
      await transaction`select id, content from term_sheet_versions where id = ${termSheetVersionId} and deal_id = ${dealId}`;
    const termSheet = termSheets[0];
    if (!termSheet) throw new ContractNotFoundError();
    const content = TermSheetContentSchema.parse(termSheet.content);
    const hash = contentHash(content);
    if (hash === current.version.contentHash)
      throw new RedlineHashUnchangedError();
    await transaction`select pg_advisory_xact_lock(hashtextextended(${dealId}, 0))`;
    const versionNumber = nextContractVersion(current.version.versionNumber);
    await transaction`
      insert into contract_versions (id, deal_id, source_term_sheet_version_id, version_number, content_hash, content, signing_expires_at, created_by_clerk_user_id)
      values (${randomUUID()}, ${dealId}, ${termSheet.id}, ${versionNumber}, ${hash}, ${transaction.json(content)}, ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}, ${clerkUserId})
    `;
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${dealId}, 'CONTRACT_SIGNATURES_RESET', ${clerkUserId}, ${transaction.json({ fromVersion: current.version.versionNumber, toVersion: versionNumber, contentHash: hash })})
    `;
    await transaction`update deals set state = 'NEGOTIATING', updated_at = now() where id = ${dealId}`;
    return readContractView(transaction, dealId) as Promise<ContractView>;
  }
}

export async function createRedlineVersion(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
  termSheetVersionId: string,
): Promise<ContractView> {
  return sql.begin((transaction) =>
    redlineContractInTransaction(
      transaction,
      dealId,
      clerkUserId,
      termSheetVersionId,
    ),
  ) as Promise<ContractView>;
}

export async function exportContractAudit(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
): Promise<ContractView | null> {
  return findContractForParty(sql, dealId, clerkUserId);
}

export async function createContractInvite(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
): Promise<string | null> {
  return sql.begin(async (transaction) => {
    const role = await findPartyRole(transaction, dealId, clerkUserId);
    const contract = await readContractView(transaction, dealId);
    if (!role || !contract) return null;
    const token = ShareTokenSchema.parse(randomBytes(32).toString("base64url"));
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await transaction`
      insert into contract_invites (id, deal_id, contract_version_id, token_hash, expires_at, created_by_clerk_user_id)
      values (${randomUUID()}, ${dealId}, ${contract.version.id}, ${tokenHash}, ${contract.version.signingExpiresAt}, ${clerkUserId})
    `;
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${dealId}, 'CONTRACT_INVITE_CREATED', ${clerkUserId}, ${transaction.json({ versionNumber: contract.version.versionNumber, expiresAt: contract.version.signingExpiresAt.toISOString() })})
    `;
    return token;
  });
}

export async function acceptContractInvite(
  sql: Sql,
  token: string,
  clerkUserId: string,
): Promise<string> {
  const parsedToken = ShareTokenSchema.safeParse(token);
  if (!parsedToken.success) throw new ContractInviteNotFoundError();
  return sql.begin(async (transaction) => {
    const tokenHash = createHash("sha256")
      .update(parsedToken.data)
      .digest("hex");
    const rows = await transaction`
      select id, deal_id as "dealId", expires_at as "expiresAt"
      from contract_invites where token_hash = ${tokenHash} and accepted_at is null
      limit 1
    `;
    const invite = rows[0];
    if (!invite || new Date(invite.expiresAt).getTime() < Date.now())
      throw new ContractInviteNotFoundError();
    const existingUser = await transaction`
      select role from deal_parties where deal_id = ${invite.dealId} and clerk_user_id = ${clerkUserId}
    `;
    if (existingUser[0]?.role === "creator")
      throw new ContractInviteRoleConflictError();
    const existingBrand = await transaction`
      select clerk_user_id from deal_parties where deal_id = ${invite.dealId} and role = 'brand'
    `;
    if (existingBrand[0] && existingBrand[0].clerk_user_id !== clerkUserId)
      throw new ContractInviteRoleConflictError();
    await transaction`
      insert into deal_parties (deal_id, clerk_user_id, role)
      values (${invite.dealId}, ${clerkUserId}, 'brand')
      on conflict (deal_id, clerk_user_id) do nothing
    `;
    await transaction`
      update contract_invites set accepted_clerk_user_id = ${clerkUserId}, accepted_at = now()
      where id = ${invite.id} and accepted_at is null
    `;
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${invite.dealId}, 'CONTRACT_INVITE_ACCEPTED', ${clerkUserId}, ${transaction.json({ inviteId: invite.id })})
    `;
    return invite.dealId;
  });
}
