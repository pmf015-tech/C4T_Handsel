import { describe, expect, it } from "vitest";

import { buildTermSheetContent } from "./term-sheet";

describe("buildTermSheetContent", () => {
  it("creates an immutable bilingual snapshot from a deal projection", () => {
    expect(
      buildTermSheetContent({
        id: "46781a56-5fb5-4b81-91a8-7f62b0a70da3",
        title: "QA creator launch",
        counterpartyName: "Handsel test brand",
        currency: "HKD",
        creatorShareBasisPoints: 2000,
        projectedRevenueMinorUnits: 1_000_000,
        totalMilestoneAmountMinorUnits: 250_000,
        disputeClause: "REFUND_BRAND",
        milestones: [
          {
            position: 1,
            title: "Launch content",
            amountMinorUnits: 250_000,
            dueAt: new Date("2026-08-01T00:00:00.000Z"),
          },
        ],
      }),
    ).toEqual({
      dealId: "46781a56-5fb5-4b81-91a8-7f62b0a70da3",
      title: "QA creator launch",
      counterpartyName: "Handsel test brand",
      currency: "HKD",
      creatorShareBasisPoints: 2000,
      projectedRevenueMinorUnits: 1_000_000,
      totalMilestoneAmountMinorUnits: 250_000,
      disputeClause: "REFUND_BRAND",
      milestones: [
        {
          position: 1,
          title: "Launch content",
          amountMinorUnits: 250_000,
          dueAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("orders copied milestone rows by their stable position", () => {
    // Given: a deal projection whose rows arrive out of order.
    const deal = {
      id: "46781a56-5fb5-4b81-91a8-7f62b0a70da3",
      title: "QA creator launch",
      counterpartyName: "Handsel test brand",
      currency: "HKD" as const,
      creatorShareBasisPoints: 2000,
      projectedRevenueMinorUnits: 1_000_000,
      totalMilestoneAmountMinorUnits: 250_000,
      disputeClause: "REFUND_BRAND" as const,
      state: "DRAFT" as const,
      createdByClerkUserId: "user_123",
      createdAt: new Date("2026-07-16T00:00:00.000Z"),
      updatedAt: new Date("2026-07-16T00:00:00.000Z"),
      milestones: [
        {
          id: "10e11db9-3987-4d06-b89c-f11450efc667",
          position: 2,
          title: "Follow-up content",
          amountMinorUnits: 100_000,
          dueAt: new Date("2026-08-15T00:00:00.000Z"),
        },
        {
          id: "6f14f7e8-397d-4ba3-b460-76ac7d7e916d",
          position: 1,
          title: "Launch content",
          amountMinorUnits: 150_000,
          dueAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
    };

    // When: immutable term-sheet content is built.
    const content = buildTermSheetContent(deal);

    // Then: the snapshot order follows stable milestone positions.
    expect(content.milestones.map(({ position }) => position)).toEqual([1, 2]);
  });
});
