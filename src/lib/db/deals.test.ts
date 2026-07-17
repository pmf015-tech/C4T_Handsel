import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { CreateDealInputSchema } from "@/lib/deals/input";
import {
  createTermSheetVersion,
  findDealForParty,
  findSharedTermSheet,
  parseDealSummary,
  parseTermSheetVersion,
  saveDealDraft,
} from "./deals";

const baseDealRow = {
  id: "46781a56-5fb5-4b81-91a8-7f62b0a70da3",
  title: "QA creator launch",
  counterpartyName: "Handsel test brand",
  currency: "HKD",
  creatorShareBasisPoints: 2000,
  projectedRevenueMinorUnits: "1000000",
  totalMilestoneAmountMinorUnits: "250000",
  disputeClause: "REFUND_BRAND",
  state: "DRAFT",
  createdByClerkUserId: "user_123",
  createdAt: new Date("2026-07-16T00:00:00.000Z"),
  updatedAt: new Date("2026-07-16T00:00:00.000Z"),
};

const validDealInput = CreateDealInputSchema.parse({
  title: "QA creator launch",
  counterpartyName: "Handsel test brand",
  currency: "HKD",
  creatorShareBasisPoints: 2000,
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

type RecordedQuery = Readonly<{
  text: string;
  values: readonly unknown[];
}>;

function compactSql(strings: TemplateStringsArray): string {
  return strings.join("?").replace(/\s+/g, " ").trim();
}

describe("parseDealSummary", () => {
  it("converts Postgres bigint strings into safe integer minor units", () => {
    expect(
      parseDealSummary({
        ...baseDealRow,
        milestones: [
          {
            id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
            position: 1,
            title: "Launch content",
            amountMinorUnits: "250000",
            dueAt: new Date("2026-08-01T00:00:00.000Z"),
          },
        ],
      }),
    ).toMatchObject({
      projectedRevenueMinorUnits: 1_000_000,
      totalMilestoneAmountMinorUnits: 250_000,
      milestones: [
        {
          position: 1,
          amountMinorUnits: 250_000,
        },
      ],
    });
  });
});

describe("parseTermSheetVersion", () => {
  it("defaults old immutable content without milestone rows to an empty list", () => {
    // Given: a term-sheet row created before milestone snapshots existed.
    const row = {
      id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
      dealId: baseDealRow.id,
      versionNumber: 1,
      contentHash: "a".repeat(64),
      shareToken: "o0Fn_R7epZ5UxKCpp2x0cyvbPj-PBQiIT_cYCahI1oQ",
      content: {
        dealId: baseDealRow.id,
        title: baseDealRow.title,
        counterpartyName: baseDealRow.counterpartyName,
        currency: baseDealRow.currency,
        creatorShareBasisPoints: baseDealRow.creatorShareBasisPoints,
        projectedRevenueMinorUnits: 1_000_000,
        totalMilestoneAmountMinorUnits: 250_000,
        disputeClause: baseDealRow.disputeClause,
      },
      expiresAt: new Date("2026-07-30T00:00:00.000Z"),
      createdAt: new Date("2026-07-16T00:00:00.000Z"),
    };

    // When: the adapter parses the historical immutable row.
    const version = parseTermSheetVersion(row);

    // Then: public rendering receives an empty-safe list.
    expect(version.content.milestones).toEqual([]);
  });
});

describe("saveDealDraft", () => {
  it("persists the deal, party, ordered milestones, and event in one transaction", async () => {
    // Given: a recording transaction adapter and a valid two-row deal.
    const queries: RecordedQuery[] = [];
    let transactionCount = 0;
    const transaction = Object.assign(
      async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
        const text = compactSql(strings);
        queries.push({ text, values });
        return text.includes("insert into deal_parties") ? [{}] : [];
      },
      { json: (value: unknown) => value },
    );
    const sql = Object.assign(async () => [], {
      begin: async (
        callback: (activeTransaction: typeof transaction) => Promise<unknown>,
      ) => {
        transactionCount += 1;
        return callback(transaction);
      },
    });

    // When: the repository saves the draft.
    await Reflect.apply(saveDealDraft, undefined, [
      sql,
      "user_creator_1",
      validDealInput,
    ]);

    // Then: every trust-core write is ordered inside the same transaction.
    expect(transactionCount).toBe(1);
    expect(queries.map(({ text }) => text)).toEqual([
      expect.stringContaining("insert into deals"),
      expect.stringContaining("insert into deal_parties"),
      expect.stringContaining("insert into deal_milestones"),
      expect.stringContaining("insert into deal_milestones"),
      expect.stringContaining("insert into deal_events"),
    ]);
    expect(queries[2]?.values.slice(2, 6)).toEqual([
      1,
      "Launch content",
      150_000,
      "2026-08-01",
    ]);
    expect(queries[3]?.values.slice(2, 6)).toEqual([
      2,
      "Follow-up content",
      100_000,
      "2026-08-15",
    ]);
    expect(
      queries.every(({ text }) => !/\b(update|delete)\b/i.test(text)),
    ).toBe(true);
  });
});

describe("findDealForParty", () => {
  it("scopes the deal to its party and retrieves bigint-safe milestones in position order", async () => {
    // Given: database rows returned by the two party-scoped repository queries.
    const queries: RecordedQuery[] = [];
    const sql = async (
      strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ) => {
      const text = compactSql(strings);
      queries.push({ text, values });
      if (text.includes("from deals")) return [baseDealRow];
      return [
        {
          id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
          position: 1,
          title: "Launch content",
          amountMinorUnits: "250000",
          dueAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ];
    };

    // When: an authenticated party retrieves the deal.
    const result = await Reflect.apply(findDealForParty, undefined, [
      sql,
      baseDealRow.id,
      "user_123",
    ]);

    // Then: authorization remains in SQL and milestone values are safe numbers.
    expect(queries[0]?.text).toContain(
      "join deal_parties p on p.deal_id = d.id",
    );
    expect(queries[0]?.text).toContain(
      "where d.id = ? and p.clerk_user_id = ?",
    );
    expect(queries[1]?.text).toContain("order by position asc");
    expect(result).toMatchObject({
      milestones: [{ position: 1, amountMinorUnits: 250_000 }],
    });
  });
});

describe("createTermSheetVersion", () => {
  it("locks version allocation and persists only the share-token hash", async () => {
    // Given: an authorized deal and a recording transactional adapter.
    const queries: RecordedQuery[] = [];
    const transaction = Object.assign(
      async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
        const text = compactSql(strings);
        queries.push({ text, values });
        if (text.includes("from deals")) return [baseDealRow];
        if (text.includes("from deal_milestones")) {
          return [
            {
              id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
              position: 1,
              title: "Launch content",
              amountMinorUnits: "250000",
              dueAt: new Date("2026-08-01T00:00:00.000Z"),
            },
          ];
        }
        if (text.includes("coalesce(max(version_number)")) {
          return [{ versionNumber: 1 }];
        }
        if (text.includes("insert into term_sheet_versions")) {
          return [
            {
              id: values[0],
              dealId: values[1],
              versionNumber: values[2],
              contentHash: values[3],
              shareToken: values[4],
              content: values[5],
              expiresAt: values[6],
              createdAt: new Date("2026-07-17T00:00:00.000Z"),
            },
          ];
        }
        return [];
      },
      { json: (value: unknown) => value },
    );
    const sql = Object.assign(async () => [], {
      begin: async (
        callback: (activeTransaction: typeof transaction) => Promise<unknown>,
      ) => callback(transaction),
    });

    // When: a new immutable term-sheet version is allocated.
    const version = await Reflect.apply(createTermSheetVersion, undefined, [
      sql,
      baseDealRow.id,
      "user_123",
    ]);

    // Then: allocation is serialized and storage never receives the raw token.
    expect(version?.shareToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const lockIndex = queries.findIndex(({ text }) =>
      text.includes("pg_advisory_xact_lock(hashtextextended"),
    );
    const allocationIndex = queries.findIndex(({ text }) =>
      text.includes("coalesce(max(version_number)"),
    );
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(lockIndex).toBeLessThan(allocationIndex);
    const insert = queries.find(({ text }) =>
      text.includes("insert into term_sheet_versions"),
    );
    expect(insert?.text).toContain("share_token_hash");
    expect(insert?.text).not.toMatch(/\bshare_token\b/);
    expect(insert?.values).not.toContain(version?.shareToken);
    expect(insert?.values).toContain(
      createHash("sha256")
        .update(version?.shareToken ?? "")
        .digest("hex"),
    );
  });
});

describe("findSharedTermSheet", () => {
  it.each([
    ["too short", "a".repeat(42)],
    ["too long", "a".repeat(44)],
    ["non-base64url character", `${"a".repeat(42)}+`],
  ])("does not query storage for a %s token", async (_case, shareToken) => {
    // Given: a query adapter that records every attempted database call.
    let queryCount = 0;
    const sql = async () => {
      queryCount += 1;
      return [];
    };

    // When: an untrusted malformed token reaches the lookup boundary.
    const result = await Reflect.apply(findSharedTermSheet, undefined, [
      sql,
      shareToken,
    ]);

    // Then: lookup fails closed before issuing SQL.
    expect(result).toBeNull();
    expect(queryCount).toBe(0);
  });

  it("hashes an exact base64url token before lookup", async () => {
    // Given: a valid presented token and a recording query adapter.
    const shareToken = "o0Fn_R7epZ5UxKCpp2x0cyvbPj-PBQiIT_cYCahI1oQ";
    const queries: RecordedQuery[] = [];
    const sql = async (
      strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ) => {
      queries.push({ text: compactSql(strings), values });
      return [];
    };

    // When: the public share lookup is performed.
    const result = await Reflect.apply(findSharedTermSheet, undefined, [
      sql,
      shareToken,
    ]);

    // Then: SQL sees only the deterministic SHA-256 hash.
    expect(result).toBeNull();
    expect(queries).toHaveLength(1);
    expect(queries[0]?.text).toContain("where share_token_hash = ?");
    expect(queries[0]?.values).toEqual([
      createHash("sha256").update(shareToken).digest("hex"),
    ]);
  });
});
