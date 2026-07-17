import { describe, expect, it } from "vitest";

import { findDealEventsForParty } from "./events";

const dealId = "46781a56-5fb5-4b81-91a8-7f62b0a70da3";

describe("findDealEventsForParty", () => {
  it("keeps event reads party-scoped and chronological", async () => {
    const queries: string[] = [];
    const sql = async (strings: TemplateStringsArray) => {
      queries.push(strings.join("?").replace(/\s+/g, " ").trim());
      return [
        {
          id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
          eventType: "DEAL_DRAFT_CREATED",
          actorClerkUserId: "user_creator",
          actorRole: "creator",
          payload: { state: "DRAFT" },
          createdAt: new Date("2026-07-17T00:00:00.000Z"),
        },
      ];
    };

    const events = await Reflect.apply(findDealEventsForParty, undefined, [
      sql,
      dealId,
      "user_creator",
    ]);

    expect(events).toHaveLength(1);
    expect(queries[0]).toContain("join deal_parties viewer");
    expect(queries[0]).toContain("viewer.clerk_user_id = ?");
    expect(queries[0]).toContain("order by e.created_at asc, e.id asc");
  });
});
