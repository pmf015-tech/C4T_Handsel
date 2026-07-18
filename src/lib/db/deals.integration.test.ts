import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CreateDealInputSchema } from "@/lib/deals/input";
import { OnboardingInputSchema } from "@/lib/profile/onboarding";
import {
  createTermSheetVersion,
  findDealForParty,
  findSharedTermSheet,
  saveDealDraft,
} from "./deals";
import {
  createContractVersion,
  createRedlineVersion,
  findContractForParty,
  signContract,
} from "./contracts";
import { ContractHashMismatchError } from "@/domain/contract/contract";
import { saveProfile } from "./profiles";
import { isDedicatedTestDatabase } from "./test-database";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "";
const appDatabaseUrl = process.env.DATABASE_URL ?? "";
const describeWithDatabase =
  isDedicatedTestDatabase(databaseUrl, appDatabaseUrl) &&
  process.env.ALLOW_DESTRUCTIVE_INTEGRATION === "true"
    ? describe
    : describe.skip;
const sql = postgres(
  databaseUrl || "postgres://handsel:handsel@127.0.0.1:54329/handsel_test",
  { max: 1 },
);

const migrationFiles = [
  "0001_profiles.sql",
  "0002_deals.sql",
  "0003_term_sheet_versions.sql",
  "0004_deal_milestones.sql",
  "0005_hash_term_sheet_share_tokens.sql",
  "0006_contracts.sql",
  "0007_contract_invites.sql",
  "0008_milestone_state_sales_reports.sql",
] as const;

describeWithDatabase("Given a migrated E1 deal database", () => {
  beforeAll(async () => {
    for (const migrationFile of migrationFiles) {
      if (migrationFile === "0005_hash_term_sheet_share_tokens.sql") {
        const appliedColumns = await sql<{ columnName: string }[]>`
          select column_name as "columnName"
          from information_schema.columns
          where table_schema = current_schema()
            and table_name = 'term_sheet_versions'
        `;
        if (
          appliedColumns.some(
            ({ columnName }) => columnName === "share_token_hash",
          )
        ) {
          continue;
        }
      }
      const migrationPath = path.resolve(
        process.cwd(),
        "db/migrations",
        migrationFile,
      );
      const migration = await readFile(migrationPath, "utf8");
      await sql.unsafe(migration);
    }
  });

  beforeEach(async () => {
    await sql`
      truncate table
        sales_reports,
        contract_signatures,
        contract_invites,
        contract_versions,
        term_sheet_versions,
        deal_milestones,
        deal_events,
        deal_parties,
        deals,
        profiles
    `;
  });

  afterAll(async () => {
    await sql.end();
  });

  it("persists a party-scoped deal and shares an ordered hash-only snapshot", async () => {
    // Given: a verified creator and a deal with integer minor-unit milestones.
    const creatorClerkUserId = "user_e1_integration_creator";
    const creator = OnboardingInputSchema.parse({
      role: "creator",
      displayName: "Kaia Chen",
      niche: "Skincare",
      followerCount: 96_200,
      engagementRateBasisPoints: 425,
      socials: ["https://instagram.com/kaia"],
      preferredLanguage: "zh-Hant",
    });
    const input = CreateDealInputSchema.parse({
      title: "Skincare launch",
      counterpartyName: "Brightside Brands",
      currency: "HKD",
      creatorShareBasisPoints: 2_000,
      projectedRevenueMinorUnits: 1_000_000,
      milestones: [
        {
          title: "Launch content",
          amountMinorUnits: 150_000,
          dueAt: "2026-08-01T00:00:00.000Z",
        },
        {
          title: "Follow-up content",
          amountMinorUnits: 100_000,
          dueAt: "2026-08-15T00:00:00.000Z",
        },
      ],
      disputeClause: "REFUND_BRAND",
    });
    await saveProfile(sql, creatorClerkUserId, creator);

    // When: the creator saves and reads the deal.
    const draft = await saveDealDraft(sql, creatorClerkUserId, input);
    const ownerDeal = await findDealForParty(sql, draft.id, creatorClerkUserId);
    const nonPartyDeal = await findDealForParty(
      sql,
      draft.id,
      "user_e1_integration_non_party",
    );

    // Then: the owner gets the exact ordered rows and a non-party gets nothing.
    expect(ownerDeal).toEqual({
      id: draft.id,
      title: "Skincare launch",
      counterpartyName: "Brightside Brands",
      currency: "HKD",
      creatorShareBasisPoints: 2_000,
      projectedRevenueMinorUnits: 1_000_000,
      totalMilestoneAmountMinorUnits: 250_000,
      disputeClause: "REFUND_BRAND",
      state: "DRAFT",
      createdByClerkUserId: creatorClerkUserId,
      viewerRole: "creator",
      createdAt: new Date(draft.createdAt),
      updatedAt: new Date(draft.createdAt),
      milestones: [
        {
          id: expect.any(String),
          position: 1,
          title: "Launch content",
          amountMinorUnits: 150_000,
          dueAt: new Date("2026-08-01T00:00:00.000Z"),
          state: "PENDING",
          deliveredAt: null,
          approvedAt: null,
        },
        {
          id: expect.any(String),
          position: 2,
          title: "Follow-up content",
          amountMinorUnits: 100_000,
          dueAt: new Date("2026-08-15T00:00:00.000Z"),
          state: "PENDING",
          deliveredAt: null,
          approvedAt: null,
        },
      ],
    });
    expect(nonPartyDeal).toBeNull();

    // When: the creator creates and resolves a public term-sheet share.
    const version = await createTermSheetVersion(
      sql,
      draft.id,
      creatorClerkUserId,
    );
    expect(version).not.toBeNull();
    if (!version) return;
    const shared = await findSharedTermSheet(sql, version.shareToken);

    // Then: the immutable snapshot preserves milestone order and integer amounts.
    expect(shared).toEqual(version);
    expect(shared?.content.milestones).toEqual([
      {
        position: 1,
        title: "Launch content",
        amountMinorUnits: 150_000,
        dueAt: "2026-08-01T00:00:00.000Z",
      },
      {
        position: 2,
        title: "Follow-up content",
        amountMinorUnits: 100_000,
        dueAt: "2026-08-15T00:00:00.000Z",
      },
    ]);

    const columns = await sql<{ columnName: string }[]>`
      select column_name as "columnName"
      from information_schema.columns
      where table_schema = current_schema()
        and table_name = 'term_sheet_versions'
      order by ordinal_position
    `;
    const storedRows = await sql<
      { shareTokenHash: string; serializedRow: string }[]
    >`
      select
        share_token_hash as "shareTokenHash",
        to_jsonb(term_sheet_versions)::text as "serializedRow"
      from term_sheet_versions
      where id = ${version.id}
    `;
    const stored = storedRows[0];

    // Then: schema and values contain only the SHA-256 token hash.
    expect(columns.map(({ columnName }) => columnName)).toContain(
      "share_token_hash",
    );
    expect(columns.map(({ columnName }) => columnName)).not.toContain(
      "share_token",
    );
    expect(stored?.shareTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored?.shareTokenHash).toBe(
      createHash("sha256").update(version.shareToken).digest("hex"),
    );
    expect(stored?.serializedRow).not.toContain(version.shareToken);

    // When: an invalid token reaches the public lookup boundary.
    const malformedLookup = await findSharedTermSheet(
      sql,
      `${version.shareToken}+`,
    );

    // Then: malformed input never resolves a shared term sheet.
    expect(malformedLookup).toBeNull();
  });

  it("keeps signatures bound to the current hash and resets them on redline", async () => {
    // Given: a creator-owned deal with an immutable term sheet and a second verified party.
    const creatorId = "user_e2_integration_creator";
    const brandId = "user_e2_integration_brand";
    const profile = OnboardingInputSchema.parse({
      role: "creator",
      displayName: "Creator E2",
      niche: "Beauty",
      followerCount: 1000,
      engagementRateBasisPoints: 500,
      socials: ["https://instagram.com/creator-e2"],
      preferredLanguage: "en",
    });
    await saveProfile(sql, creatorId, profile);
    await saveProfile(
      sql,
      brandId,
      OnboardingInputSchema.parse({
        role: "brand",
        displayName: "Brand E2",
        productCategory: "Beauty",
        website: "https://brand-e2.example",
        preferredLanguage: "en",
      }),
    );
    const draft = await saveDealDraft(
      sql,
      creatorId,
      CreateDealInputSchema.parse({
        title: "E2 signing",
        counterpartyName: "Brand E2",
        currency: "HKD",
        creatorShareBasisPoints: 2000,
        projectedRevenueMinorUnits: 100000,
        milestones: [
          {
            title: "Launch",
            amountMinorUnits: 10000,
            dueAt: "2026-08-01T00:00:00.000Z",
          },
        ],
        disputeClause: "REFUND_BRAND",
      }),
    );
    await sql`insert into deal_parties (deal_id, clerk_user_id, role) values (${draft.id}, ${brandId}, 'brand')`;
    const termSheet = await createTermSheetVersion(sql, draft.id, creatorId);
    if (!termSheet) throw new Error("term sheet fixture missing");
    const contract = await createContractVersion(sql, draft.id, creatorId);
    if (!contract) throw new Error("contract fixture missing");

    // When: a party submits an old hash, then both parties sign the current version.
    await expect(
      signContract(sql, draft.id, creatorId, "b".repeat(64)),
    ).rejects.toBeInstanceOf(ContractHashMismatchError);
    await signContract(sql, draft.id, creatorId, contract.version.contentHash);
    await signContract(sql, draft.id, brandId, contract.version.contentHash);

    // Then: the deal becomes signed and the second immutable term-sheet version creates a fresh contract version.
    const signed = await findContractForParty(sql, draft.id, brandId);
    expect(signed?.signatures).toHaveLength(2);
    expect((await findDealForParty(sql, draft.id, creatorId))?.state).toBe(
      "SIGNED",
    );
    const changedContent = {
      ...termSheet.content,
      title: "E2 signing redline",
    };
    const changedHash = createHash("sha256")
      .update(JSON.stringify(changedContent))
      .digest("hex");
    const redlineToken = "b".repeat(43);
    const redlineTokenHash = createHash("sha256")
      .update(redlineToken)
      .digest("hex");
    const redlineRows = await sql<{ id: string }[]>`
      insert into term_sheet_versions (id, deal_id, version_number, content_hash, share_token_hash, content, expires_at, created_by_clerk_user_id)
      values (gen_random_uuid(), ${draft.id}, 2, ${changedHash}, ${redlineTokenHash}, ${sql.json(changedContent)}, now() + interval '14 days', ${creatorId})
      returning id
    `;
    const redlineTermSheetId = redlineRows[0]?.id;
    if (!redlineTermSheetId)
      throw new Error("redline term sheet fixture missing");
    const redline = await createRedlineVersion(
      sql,
      draft.id,
      creatorId,
      redlineTermSheetId,
    );
    expect(redline.version.versionNumber).toBe(2);
    expect(redline.signatures).toHaveLength(0);
    expect(
      redline.events.some(
        (event) => event.eventType === "CONTRACT_SIGNATURES_RESET",
      ),
    ).toBe(true);
  });
});
