import { CLOCKS } from "@/domain/deal/types";

/**
 * Sales-report lateness rules — spec-handsel-mvp.md E3 / lifecycle clock S1.
 *
 * Monthly report with a 7-day grace window after the period ends. A report
 * submitted (or still missing) after the grace boundary is LATE; a missing
 * report inside the window is PENDING, not yet late. Two consecutive LATE
 * periods open a dispute automatically (acceptance criterion 3). Pure module:
 * timestamps injected, no I/O. The lib layer is responsible for checking
 * whether a late-dispute is already open before acting on
 * shouldOpenLateDispute, keeping the trigger idempotent.
 */

export type SalesReportTiming = "ON_TIME" | "LATE" | "PENDING";

const GRACE_MS = CLOCKS.SALES_REPORT_GRACE_DAYS * 24 * 60 * 60 * 1000;

export function assessSalesReportTiming(
  periodEnd: Date,
  submittedAt: Date | null,
  now: Date = new Date(),
): SalesReportTiming {
  const graceBoundary = periodEnd.getTime() + GRACE_MS;
  if (submittedAt !== null)
    return submittedAt.getTime() <= graceBoundary ? "ON_TIME" : "LATE";
  return now.getTime() > graceBoundary ? "LATE" : "PENDING";
}

export function shouldOpenLateDispute(
  timings: readonly SalesReportTiming[],
): boolean {
  if (timings.length < 2) return false;
  const latest = timings[timings.length - 1];
  const previous = timings[timings.length - 2];
  return latest === "LATE" && previous === "LATE";
}
