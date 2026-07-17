import { describe, expect, it } from "vitest";

import { CreateDealInputSchema } from "./input";

const validMilestone = {
  title: "Launch content",
  amountMinorUnits: 250_000,
  dueAt: "2026-08-01T00:00:00.000Z",
};

const validInput = {
  title: "Glow Ritual launch",
  counterpartyName: "Brightside Brands",
  currency: "HKD",
  creatorShareBasisPoints: 1800,
  projectedRevenueMinorUnits: 1_000_000,
  milestones: [validMilestone],
  disputeClause: "REFUND_BRAND",
};

function milestones(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Milestone ${index + 1}`,
    amountMinorUnits: 10_000,
    dueAt: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));
}

describe("CreateDealInputSchema milestone boundary", () => {
  it.each([1, 20])("accepts %i milestone rows", (count) => {
    // Given: request JSON at an accepted milestone-count boundary.
    const input = { ...validInput, milestones: milestones(count) };

    // When: the zod boundary parses the request.
    const result = CreateDealInputSchema.safeParse(input);

    // Then: the request is accepted.
    expect(result.success).toBe(true);
  });

  it.each([0, 21])("rejects %i milestone rows", (count) => {
    // Given: request JSON outside the accepted 1-20 boundary.
    const input = { ...validInput, milestones: milestones(count) };

    // When: the zod boundary parses the request.
    const result = CreateDealInputSchema.safeParse(input);

    // Then: the request is rejected.
    expect(result.success).toBe(false);
  });

  it("rejects normalized duplicate titles", () => {
    // Given: duplicate titles that differ only by case and whitespace.
    const input = {
      ...validInput,
      milestones: [
        validMilestone,
        {
          ...validMilestone,
          title: ` ${validMilestone.title.toUpperCase()} `,
        },
      ],
    };

    // When: the zod boundary parses the request.
    const result = CreateDealInputSchema.safeParse(input);

    // Then: the request is rejected.
    expect(result.success).toBe(false);
  });

  it.each([0, -1, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe milestone amount %s",
    (amountMinorUnits) => {
      // Given: request JSON with invalid integer minor units.
      const input = {
        ...validInput,
        milestones: [{ ...validMilestone, amountMinorUnits }],
      };

      // When: the zod boundary parses the request.
      const result = CreateDealInputSchema.safeParse(input);

      // Then: the request is rejected.
      expect(result.success).toBe(false);
    },
  );

  it("rejects an invalid due date", () => {
    // Given: request JSON with an invalid ISO date-time.
    const input = {
      ...validInput,
      milestones: [{ ...validMilestone, dueAt: "not-a-date" }],
    };

    // When: the zod boundary parses the request.
    const result = CreateDealInputSchema.safeParse(input);

    // Then: the request is rejected.
    expect(result.success).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    // Given: request JSON with a syntactically ISO but impossible date.
    const input = {
      ...validInput,
      milestones: [
        {
          ...validMilestone,
          dueAt: "2026-02-30T00:00:00.000Z",
        },
      ],
    };

    // When: the zod boundary parses the request.
    const result = CreateDealInputSchema.safeParse(input);

    // Then: the request is rejected instead of normalized to March.
    expect(result.success).toBe(false);
  });
});
