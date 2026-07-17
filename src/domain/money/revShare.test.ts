import { describe, expect, it } from "vitest";

import { InvalidRevShareInputError, computeRevShare } from "./revShare";

describe("computeRevShare", () => {
  it("splits a gross amount exactly with no remainder lost", () => {
    const result = computeRevShare(100_000, 2_000);
    expect(result.creatorShareMinorUnits).toBe(20_000);
    expect(result.brandShareMinorUnits).toBe(80_000);
    expect(result.creatorShareMinorUnits + result.brandShareMinorUnits).toBe(
      100_000,
    );
  });

  it("returns integers only, never floats", () => {
    const result = computeRevShare(1_000, 3_333);
    expect(Number.isInteger(result.creatorShareMinorUnits)).toBe(true);
    expect(Number.isInteger(result.brandShareMinorUnits)).toBe(true);
  });

  it("rounds an exact tie down to the nearest even quotient (banker's rounding)", () => {
    // 1 * 5000bp / 10000 = 0.5 exactly. Quotient 0 is even -> rounds down to 0.
    const result = computeRevShare(1, 5_000);
    expect(result.creatorShareMinorUnits).toBe(0);
    expect(result.brandShareMinorUnits).toBe(1);
  });

  it("rounds an exact tie up to the nearest even quotient (banker's rounding)", () => {
    // 3 * 5000bp / 10000 = 1.5 exactly. Quotient 1 is odd -> rounds up to 2.
    const result = computeRevShare(3, 5_000);
    expect(result.creatorShareMinorUnits).toBe(2);
    expect(result.brandShareMinorUnits).toBe(1);
  });

  it("assigns everything to the brand at 0 basis points", () => {
    const result = computeRevShare(50_000, 0);
    expect(result.creatorShareMinorUnits).toBe(0);
    expect(result.brandShareMinorUnits).toBe(50_000);
  });

  it("assigns everything to the creator at 10000 basis points", () => {
    const result = computeRevShare(50_000, 10_000);
    expect(result.creatorShareMinorUnits).toBe(50_000);
    expect(result.brandShareMinorUnits).toBe(0);
  });

  it("returns zero shares for zero gross revenue", () => {
    const result = computeRevShare(0, 4_200);
    expect(result.creatorShareMinorUnits).toBe(0);
    expect(result.brandShareMinorUnits).toBe(0);
  });

  it("sums exactly to gross for a spread of valid (gross, basisPoints) pairs", () => {
    const grossSamples = [
      0, 1, 2, 3, 7, 99, 100, 101, 999, 1_000, 33_333, 1_000_000,
      9_007_199_254_740_991,
    ];
    const basisPointSamples = [
      0, 1, 1_000, 2_500, 3_333, 5_000, 6_667, 9_999, 10_000,
    ];

    for (const gross of grossSamples) {
      for (const basisPoints of basisPointSamples) {
        const result = computeRevShare(gross, basisPoints);
        expect(
          result.creatorShareMinorUnits + result.brandShareMinorUnits,
        ).toBe(gross);
        expect(result.creatorShareMinorUnits).toBeGreaterThanOrEqual(0);
        expect(result.brandShareMinorUnits).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("rejects a negative gross amount", () => {
    expect(() => computeRevShare(-1, 5_000)).toThrow(InvalidRevShareInputError);
  });

  it("rejects a non-safe-integer gross amount", () => {
    expect(() => computeRevShare(1.5, 5_000)).toThrow(
      InvalidRevShareInputError,
    );
  });

  it("rejects basis points below zero", () => {
    expect(() => computeRevShare(1_000, -1)).toThrow(InvalidRevShareInputError);
  });

  it("rejects basis points above 10000", () => {
    expect(() => computeRevShare(1_000, 10_001)).toThrow(
      InvalidRevShareInputError,
    );
  });

  it("rejects non-integer basis points", () => {
    expect(() => computeRevShare(1_000, 50.5)).toThrow(
      InvalidRevShareInputError,
    );
  });
});
