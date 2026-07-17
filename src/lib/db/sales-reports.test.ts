import { describe, expect, it } from "vitest";

import { findSalesReportsForParty, submitSalesReport } from "./sales-reports";

const dealId = "46781a56-5fb5-4b81-91a8-7f62b0a70da3";

function compact(strings: TemplateStringsArray): string {
  return strings.join("?").replace(/\s+/g, " ").trim();
}

describe("sales report database adapter", () => {
  it("reads reports through the authenticated deal-party join", async () => {
    const queries: string[] = [];
    const sql = async (strings: TemplateStringsArray) => {
      queries.push(compact(strings));
      return [
        {
          id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
          dealId,
          periodEnd: new Date("2026-07-01T00:00:00.000Z"),
          units: 10,
          grossRevenueMinorUnits: "100000",
          timing: "ON_TIME",
          submittedByClerkUserId: "user_brand",
          submittedAt: new Date("2026-07-02T00:00:00.000Z"),
        },
      ];
    };

    const reports = await Reflect.apply(findSalesReportsForParty, undefined, [
      sql,
      dealId,
      "user_creator",
    ]);

    expect(reports[0]).toMatchObject({ grossRevenueMinorUnits: 100_000 });
    expect(queries[0]).toContain("join deal_parties p");
    expect(queries[0]).toContain("p.clerk_user_id = ?");
  });

  it("writes the report and late-dispute trigger in one transaction", async () => {
    const queries: string[] = [];
    const transaction = Object.assign(
      async (strings: TemplateStringsArray) => {
        const text = compact(strings);
        queries.push(text);
        if (text.includes("from deals"))
          return [{ role: "brand", creatorShareBasisPoints: 2_000 }];
        if (text.includes("select id from sales_reports")) return [];
        if (text.includes("returning"))
          return [
            {
              id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
              dealId,
              periodEnd: new Date("2026-06-01T00:00:00.000Z"),
              units: 10,
              grossRevenueMinorUnits: 100_000,
              timing: "LATE",
              submittedByClerkUserId: "user_brand",
              submittedAt: new Date("2026-07-17T00:00:00.000Z"),
            },
          ];
        if (text.includes("select timing"))
          return [{ timing: "LATE" }, { timing: "LATE" }];
        return [];
      },
      { json: (value: unknown) => value },
    );
    const sql = {
      begin: async (
        callback: (activeTransaction: typeof transaction) => Promise<unknown>,
      ) => callback(transaction),
    };

    await Reflect.apply(submitSalesReport, undefined, [
      sql,
      dealId,
      "user_brand",
      {
        periodEnd: "2026-06-01",
        units: 10,
        grossRevenueMinorUnits: 100_000,
      },
      new Date("2026-07-17T00:00:00.000Z"),
    ]);

    expect(
      queries.filter((query) => query.includes("insert into deal_events")),
    ).toHaveLength(2);
    expect(
      queries.every((query) => !/\bupdate\b|\bdelete\b/i.test(query)),
    ).toBe(true);
  });
});
