import { describe, expect, it } from "vitest";

import { buildSettlementStatement } from "./settlement-statement";

const baseInput = {
  dealTitle: "Glow Ritual × Brightside",
  counterpartyName: "Brightside Brands",
  currency: "HKD",
  creatorShareBasisPoints: 1_800,
  report: {
    periodEnd: "2026-08-31",
    units: 420,
    grossRevenueMinorUnits: 1_000_000,
    timing: "ON_TIME" as const,
  },
  generatedAt: "2026-09-01T00:00:00.000Z",
};

describe("buildSettlementStatement", () => {
  it("splits gross into creator and brand shares matching computeRevShare", () => {
    // Arrange / Act
    const statement = buildSettlementStatement(baseInput);

    // Assert: 18% of 1,000,000 minor = 180,000; brand takes the remainder.
    expect(statement.creatorShareMinorUnits).toBe(180_000);
    expect(statement.brandShareMinorUnits).toBe(820_000);
  });

  it("guarantees creator + brand shares sum to gross for odd amounts", () => {
    const statement = buildSettlementStatement({
      ...baseInput,
      creatorShareBasisPoints: 3_333,
      report: { ...baseInput.report, grossRevenueMinorUnits: 999_999 },
    });

    expect(
      statement.creatorShareMinorUnits + statement.brandShareMinorUnits,
    ).toBe(999_999);
  });

  it("preserves integer minor units — never emits fractional cents", () => {
    const statement = buildSettlementStatement({
      ...baseInput,
      report: { ...baseInput.report, grossRevenueMinorUnits: 100_001 },
    });

    expect(Number.isInteger(statement.creatorShareMinorUnits)).toBe(true);
    expect(Number.isInteger(statement.brandShareMinorUnits)).toBe(true);
  });

  it("flags a late report", () => {
    const onTime = buildSettlementStatement(baseInput);
    const late = buildSettlementStatement({
      ...baseInput,
      report: { ...baseInput.report, timing: "LATE" },
    });

    expect(onTime.isLate).toBe(false);
    expect(late.isLate).toBe(true);
  });

  it("formats bilingual line items with the currency code and two decimals", () => {
    const statement = buildSettlementStatement(baseInput);
    const grossLine = statement.lines.find((line) => line.key === "gross");
    const creatorLine = statement.lines.find((line) => line.key === "creator");

    expect(grossLine?.value).toBe("HKD 10,000.00");
    expect(grossLine?.labelEn).toContain("Gross");
    expect(grossLine?.labelZh).toContain("總");
    expect(creatorLine?.value).toBe("HKD 1,800.00");
  });

  it("carries through the reporting period, deal identity, and generated time", () => {
    const statement = buildSettlementStatement(baseInput);

    expect(statement.dealTitle).toBe("Glow Ritual × Brightside");
    expect(statement.periodEnd).toBe("2026-08-31");
    expect(statement.generatedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(statement.creatorShareBasisPoints).toBe(1_800);
  });
});
