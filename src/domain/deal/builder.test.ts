import { describe, expect, it } from "vitest";
import { createDealDraft, InvalidDealDraftError } from "./builder";

const validMilestone = {
  title: "Launch content",
  amountMinorUnits: 250_000,
  dueAt: "2026-08-01T00:00:00.000Z",
};

const validInput = {
  title: "Glow Ritual launch",
  counterpartyName: "Brightside Brands",
  currency: "HKD" as const,
  creatorShareBasisPoints: 1800,
  projectedRevenueMinorUnits: 1_000_000,
  milestones: [validMilestone],
  disputeClause: "REFUND_BRAND" as const,
};

function milestones(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Milestone ${index + 1}`,
    amountMinorUnits: 10_000,
    dueAt: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));
}

describe("createDealDraft", () => {
  it("creates a draft with integer money totals", () => {
    const draft = createDealDraft(
      validInput,
      "deal-1",
      "2026-07-16T00:00:00.000Z",
    );

    expect(draft).toMatchObject({
      id: "deal-1",
      state: "DRAFT",
      totalMilestoneAmountMinorUnits: 250_000,
    });
  });

  it("rejects duplicate milestone titles before persistence", () => {
    const milestone = validInput.milestones[0];
    if (!milestone) throw new Error("Test fixture is missing a milestone");
    expect(() =>
      createDealDraft(
        {
          ...validInput,
          milestones: [
            milestone,
            { ...milestone, title: ` ${milestone.title.toUpperCase()} ` },
          ],
        },
        "deal-1",
        "2026-07-16T00:00:00.000Z",
      ),
    ).toThrow(InvalidDealDraftError);
  });

  it.each([1, 20])("accepts %i ordered milestone rows", (count) => {
    // Given: a draft at an accepted milestone-count boundary.
    const input = { ...validInput, milestones: milestones(count) };

    // When: the pure domain builder validates and totals it.
    const draft = createDealDraft(input, "deal-1", "2026-07-16T00:00:00.000Z");

    // Then: every row contributes integer minor units to the total.
    expect(draft.totalMilestoneAmountMinorUnits).toBe(count * 10_000);
  });

  it.each([0, 21])("rejects %i milestone rows", (count) => {
    // Given: a draft outside the accepted 1-20 row boundary.
    const input = { ...validInput, milestones: milestones(count) };

    // When / Then: pure validation rejects it before persistence.
    expect(() =>
      createDealDraft(input, "deal-1", "2026-07-16T00:00:00.000Z"),
    ).toThrow(InvalidDealDraftError);
  });

  it.each([0, -1, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe milestone amount %s",
    (amountMinorUnits) => {
      // Given: a milestone amount that cannot be persisted as safe minor units.
      const input = {
        ...validInput,
        milestones: [{ ...validMilestone, amountMinorUnits }],
      };

      // When / Then: pure validation rejects it.
      expect(() =>
        createDealDraft(input, "deal-1", "2026-07-16T00:00:00.000Z"),
      ).toThrow(InvalidDealDraftError);
    },
  );

  it("rejects an invalid milestone due date", () => {
    // Given: a milestone with a calendar value that cannot be parsed.
    const input = {
      ...validInput,
      milestones: [{ ...validMilestone, dueAt: "not-a-date" }],
    };

    // When / Then: pure validation rejects it.
    expect(() =>
      createDealDraft(input, "deal-1", "2026-07-16T00:00:00.000Z"),
    ).toThrow(InvalidDealDraftError);
  });

  it("rejects an impossible milestone calendar date", () => {
    // Given: a syntactically ISO date that does not exist on the calendar.
    const input = {
      ...validInput,
      milestones: [
        {
          ...validMilestone,
          dueAt: "2026-02-30T00:00:00.000Z",
        },
      ],
    };

    // When / Then: pure validation rejects Date's normalized rollover.
    expect(() =>
      createDealDraft(input, "deal-1", "2026-07-16T00:00:00.000Z"),
    ).toThrow(InvalidDealDraftError);
  });
});
