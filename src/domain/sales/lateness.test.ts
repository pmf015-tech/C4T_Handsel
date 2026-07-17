import { describe, expect, it } from "vitest";

import {
  assessSalesReportTiming,
  shouldOpenLateDispute,
  type SalesReportTiming,
} from "./lateness";

const DAY_MS = 24 * 60 * 60 * 1000;
const periodEnd = new Date("2026-06-30T23:59:59Z");
const graceBoundary = new Date(periodEnd.getTime() + 7 * DAY_MS);

describe("assessSalesReportTiming (monthly + 7-day grace)", () => {
  it("is ON_TIME when submitted before the period ends", () => {
    expect(
      assessSalesReportTiming(periodEnd, new Date("2026-06-20T00:00:00Z")),
    ).toBe("ON_TIME");
  });

  it("is ON_TIME when submitted within the 7-day grace window", () => {
    expect(
      assessSalesReportTiming(periodEnd, new Date(graceBoundary.getTime())),
    ).toBe("ON_TIME");
  });

  it("is LATE when submitted after the grace window", () => {
    expect(
      assessSalesReportTiming(periodEnd, new Date(graceBoundary.getTime() + 1)),
    ).toBe("LATE");
  });

  it("treats a missing report as LATE once the grace window has passed", () => {
    expect(
      assessSalesReportTiming(
        periodEnd,
        null,
        new Date(graceBoundary.getTime() + 1),
      ),
    ).toBe("LATE");
  });

  it("treats a missing report as PENDING while the grace window is open", () => {
    expect(
      assessSalesReportTiming(
        periodEnd,
        null,
        new Date(graceBoundary.getTime() - 1),
      ),
    ).toBe("PENDING");
  });
});

describe("shouldOpenLateDispute (2 consecutive late periods)", () => {
  function history(
    ...timings: SalesReportTiming[]
  ): readonly SalesReportTiming[] {
    return timings;
  }

  it("opens a dispute when the two most recent periods are both LATE", () => {
    expect(shouldOpenLateDispute(history("ON_TIME", "LATE", "LATE"))).toBe(
      true,
    );
  });

  it("does not open a dispute for a single late period", () => {
    expect(shouldOpenLateDispute(history("ON_TIME", "LATE"))).toBe(false);
  });

  it("does not open a dispute when late periods are not consecutive", () => {
    expect(shouldOpenLateDispute(history("LATE", "ON_TIME", "LATE"))).toBe(
      false,
    );
  });

  it("ignores a still-PENDING latest period", () => {
    expect(shouldOpenLateDispute(history("LATE", "LATE", "PENDING"))).toBe(
      false,
    );
  });

  it("returns false for an empty history", () => {
    expect(shouldOpenLateDispute(history())).toBe(false);
  });

  it("stays true for exactly two late periods and nothing else", () => {
    expect(shouldOpenLateDispute(history("LATE", "LATE"))).toBe(true);
  });
});
