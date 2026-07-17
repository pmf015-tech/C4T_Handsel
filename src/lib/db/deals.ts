import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";

import { createDealDraft, type DealDraft } from "@/domain/deal/builder";
import type { CreateDealInput } from "@/lib/deals/input";
import {
  buildTermSheetContent,
  TermSheetContentSchema,
  type TermSheetContent,
} from "@/lib/terms/term-sheet";
import { ShareTokenSchema } from "@/lib/terms/share-token";

const MinorUnitsSchema = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().safe().positive(),
);

const DealSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  counterpartyName: z.string(),
  currency: z.enum(["HKD", "TWD", "USD"]),
  creatorShareBasisPoints: z.number().int(),
  projectedRevenueMinorUnits: MinorUnitsSchema,
  totalMilestoneAmountMinorUnits: MinorUnitsSchema,
  disputeClause: z.enum([
    "REFUND_BRAND",
    "SPLIT_BY_DELIVERED_PROPORTION",
    "EXTERNAL_MEDIATION",
  ]),
  state: z.enum([
    "DRAFT",
    "NEGOTIATING",
    "SIGNED",
    "ACTIVE",
    "MILESTONE_MET",
    "PAYOUT_RELEASED",
    "DISPUTED",
    "RESOLVED",
    "COMPLETED",
    "CANCELLED",
  ]),
  createdByClerkUserId: z.string(),
  /** Role of the party this row was read for — drives role-symmetric UI. */
  viewerRole: z.enum(["creator", "brand"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  milestones: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(1).max(20),
        title: z.string().min(2).max(80),
        amountMinorUnits: MinorUnitsSchema,
        dueAt: z.coerce.date(),
        state: z
          .enum(["PENDING", "DELIVERED", "APPROVED", "FROZEN"])
          .default("PENDING"),
        deliveredAt: z.coerce.date().nullable().default(null),
        approvedAt: z.coerce.date().nullable().default(null),
      }),
    )
    .max(20)
    .default([]),
});

export type DealSummary = Readonly<z.infer<typeof DealSummarySchema>>;

const TermSheetVersionSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  contentHash: z.string().length(64),
  shareToken: ShareTokenSchema,
  content: TermSheetContentSchema,
  expiresAt: z.date(),
  latestVersionNumber: z.number().int().positive().default(1),
  createdAt: z.date(),
});

export type TermSheetVersion = Readonly<z.infer<typeof TermSheetVersionSchema>>;

export class DealPartyProfileNotFoundError extends Error {
  readonly name = "DealPartyProfileNotFoundError";

  constructor() {
    super("A verified profile is required before creating a deal");
  }
}

export function parseDealSummary(row: unknown): DealSummary {
  return DealSummarySchema.parse(row);
}

export function parseTermSheetVersion(row: unknown): TermSheetVersion {
  return TermSheetVersionSchema.parse(row);
}

export async function saveDealDraft(
  sql: Sql,
  clerkUserId: string,
  input: CreateDealInput,
): Promise<DealDraft> {
  const dealId = randomUUID();
  const createdAt = new Date().toISOString();
  const draft = createDealDraft(input, dealId, createdAt);

  await sql.begin(async (transaction) => {
    await transaction`
      insert into deals (
        id, title, counterparty_name, currency, creator_share_basis_points,
        projected_revenue_minor_units, total_milestone_amount_minor_units,
        dispute_clause, state, created_by_clerk_user_id, created_at, updated_at
      ) values (
        ${draft.id}, ${draft.title}, ${draft.counterpartyName}, ${draft.currency},
        ${draft.creatorShareBasisPoints}, ${draft.projectedRevenueMinorUnits},
        ${draft.totalMilestoneAmountMinorUnits}, ${draft.disputeClause},
        ${draft.state}, ${clerkUserId}, ${draft.createdAt}, ${draft.createdAt}
      )
    `;
    const parties = await transaction`
      insert into deal_parties (deal_id, clerk_user_id, role)
      select ${draft.id}, ${clerkUserId}, role
      from profiles
      where clerk_user_id = ${clerkUserId}
      returning deal_id
    `;
    if (parties.length !== 1) throw new DealPartyProfileNotFoundError();
    for (const [index, milestone] of draft.milestones.entries()) {
      await transaction`
        insert into deal_milestones (
          id, deal_id, position, title, amount_minor_units, due_date
        ) values (
          ${randomUUID()}, ${draft.id}, ${index + 1}, ${milestone.title},
          ${milestone.amountMinorUnits}, ${milestone.dueAt.slice(0, 10)}
        )
      `;
    }
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${draft.id}, ${"DEAL_DRAFT_CREATED"}, ${clerkUserId}, ${transaction.json(draft)})
    `;
  });

  return draft;
}

export async function findDealForParty(
  sql: Sql | TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<DealSummary | null> {
  const rows = await sql`
    select
      d.id,
      d.title,
      d.counterparty_name as "counterpartyName",
      d.currency,
      d.creator_share_basis_points as "creatorShareBasisPoints",
      d.projected_revenue_minor_units as "projectedRevenueMinorUnits",
      d.total_milestone_amount_minor_units as "totalMilestoneAmountMinorUnits",
      d.dispute_clause as "disputeClause",
      d.state,
      d.created_by_clerk_user_id as "createdByClerkUserId",
      p.role as "viewerRole",
      d.created_at as "createdAt",
      d.updated_at as "updatedAt"
    from deals d
    join deal_parties p on p.deal_id = d.id
    where d.id = ${dealId} and p.clerk_user_id = ${clerkUserId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const milestones = await sql`
    select
      id,
      position,
      title,
      amount_minor_units as "amountMinorUnits",
      due_date as "dueAt",
      state,
      delivered_at as "deliveredAt",
      approved_at as "approvedAt"
    from deal_milestones
    where deal_id = ${dealId}
    order by position asc
  `;
  return parseDealSummary({ ...row, milestones });
}

/** Dashboard read: every returned row is scoped by the authenticated party join. */
export async function listDealsForUser(
  sql: Sql,
  clerkUserId: string,
): Promise<readonly DealSummary[]> {
  const rows = await sql`
    select
      d.id,
      d.title,
      d.counterparty_name as "counterpartyName",
      d.currency,
      d.creator_share_basis_points as "creatorShareBasisPoints",
      d.projected_revenue_minor_units as "projectedRevenueMinorUnits",
      d.total_milestone_amount_minor_units as "totalMilestoneAmountMinorUnits",
      d.dispute_clause as "disputeClause",
      d.state,
      d.created_by_clerk_user_id as "createdByClerkUserId",
      p.role as "viewerRole",
      d.created_at as "createdAt",
      d.updated_at as "updatedAt"
    from deals d
    join deal_parties p
      on p.deal_id = d.id
      and p.clerk_user_id = ${clerkUserId}
    order by d.updated_at desc
  `;
  return Promise.all(
    rows.map(async (row) => {
      const milestones = await sql`
        select
          id,
          position,
          title,
          amount_minor_units as "amountMinorUnits",
          due_date as "dueAt",
          state,
          delivered_at as "deliveredAt",
          approved_at as "approvedAt"
        from deal_milestones
        where deal_id = ${row.id}
        order by position asc
      `;
      return parseDealSummary({ ...row, milestones });
    }),
  );
}

/**
 * Term-sheet body without its own transaction, so reviseDealTerms can create
 * the new version and reset the contract signatures atomically.
 */
export async function createTermSheetVersionInTransaction(
  transaction: TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<TermSheetVersion | null> {
  {
    const deal = await findDealForParty(transaction, dealId, clerkUserId);
    if (!deal) return null;

    const content = buildTermSheetContent(deal);
    const contentHash = createHash("sha256")
      .update(JSON.stringify(content))
      .digest("hex");
    const shareToken = randomBytes(32).toString("base64url");
    const shareTokenHash = createHash("sha256")
      .update(shareToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await transaction`
      select pg_advisory_xact_lock(hashtextextended(${deal.id}, 0))
    `;
    const versionRows = await transaction<{ versionNumber: number }[]>`
      select coalesce(max(version_number), 0) + 1 as "versionNumber"
      from term_sheet_versions
      where deal_id = ${deal.id}
    `;
    const versionNumber = versionRows[0]?.versionNumber;
    if (!versionNumber) throw new Error("Term-sheet version number is missing");
    const id = randomUUID();

    const rows = await transaction`
      insert into term_sheet_versions (
        id, deal_id, version_number, content_hash, share_token_hash, content,
        expires_at, created_by_clerk_user_id
      ) values (
        ${id}, ${deal.id}, ${versionNumber}, ${contentHash}, ${shareTokenHash},
        ${transaction.json(content)}, ${expiresAt}, ${clerkUserId}
      )
      returning
        id,
        deal_id as "dealId",
        version_number as "versionNumber",
        content_hash as "contentHash",
        content,
        expires_at as "expiresAt",
        created_at as "createdAt"
    `;
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (
        ${randomUUID()}, ${deal.id}, ${"TERM_SHEET_VERSION_CREATED"}, ${clerkUserId},
        ${transaction.json({ versionNumber, contentHash, expiresAt: expiresAt.toISOString() })}
      )
    `;
    return parseTermSheetVersion({ ...rows[0], shareToken });
  }
}

export async function createTermSheetVersion(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
): Promise<TermSheetVersion | null> {
  return sql.begin((transaction) =>
    createTermSheetVersionInTransaction(transaction, dealId, clerkUserId),
  ) as Promise<TermSheetVersion | null>;
}

export async function findSharedTermSheet(
  sql: Sql,
  shareToken: string,
): Promise<TermSheetVersion | null> {
  const parsedToken = ShareTokenSchema.safeParse(shareToken);
  if (!parsedToken.success) return null;
  const shareTokenHash = createHash("sha256")
    .update(parsedToken.data)
    .digest("hex");
  const rows = await sql`
    select
      id,
      deal_id as "dealId",
      version_number as "versionNumber",
      content_hash as "contentHash",
      content,
      expires_at as "expiresAt",
      (select max(latest.version_number) from term_sheet_versions latest where latest.deal_id = term_sheet_versions.deal_id) as "latestVersionNumber",
      created_at as "createdAt"
    from term_sheet_versions
    where share_token_hash = ${shareTokenHash}
    limit 1
  `;
  const row = rows[0];
  return row
    ? parseTermSheetVersion({ ...row, shareToken: parsedToken.data })
    : null;
}
