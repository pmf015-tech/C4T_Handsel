/**
 * Deal domain types — mirrors the state machine locked in spec-handsel-mvp.md.
 *
 *  DRAFT ──edit/redline──▶ NEGOTIATING ──both-signed──▶ SIGNED ──funded──▶ ACTIVE
 *    │                        │                            │                  │
 *    ▼                        ▼                            ▼        ┌────────┼──────────┐
 *  CANCELLED               CANCELLED                   CANCELLED    ▼        ▼          ▼
 *                     (offer expiry 14d,          (funding window MILESTONE DISPUTED CANCELLED
 *                      signing window 14d)         expired)        _MET      │  (per contract
 *                                                                    │       │   default terms)
 *                                                                    ▼       ▼
 *                                                              PAYOUT_   14d structured
 *                                                              RELEASED  response window
 *                                                                    │       │
 *                                                             (loop per  RESOLVED ▶ ACTIVE
 *                                                              milestone)   or default-terms
 *                                                                    ▼       execution
 *                                                                COMPLETED
 *
 * Transition LOGIC lives in stateMachine.ts and is TDD-mandatory (80%+ coverage)
 * per CLAUDE.md. Do not add transitions here without a failing test first.
 */

export type DealState =
  | "DRAFT"
  | "NEGOTIATING"
  | "SIGNED"
  | "ACTIVE"
  | "MILESTONE_MET"
  | "PAYOUT_RELEASED"
  | "DISPUTED"
  | "RESOLVED"
  | "COMPLETED"
  | "CANCELLED";

/** Dispute default clause — mandatory choice at signing (founder decision S3). */
export type DisputeDefaultClause =
  | "REFUND_BRAND"
  | "SPLIT_BY_DELIVERED_PROPORTION"
  | "EXTERNAL_MEDIATION";

/** All money in integer minor units (cents). Never floats. (CLAUDE.md rule) */
export type MinorUnits = number;

/** Lifecycle clocks — founder decision S1. Durations in days. */
export const CLOCKS = {
  TERM_SHEET_OFFER_EXPIRY_DAYS: 14,
  SIGNING_WINDOW_DAYS: 14,
  SALES_REPORT_GRACE_DAYS: 7,
  MILESTONE_REVIEW_AUTO_APPROVE_DAYS: 7,
  /** Milestone escrow prefund trigger — eng decision 1A (Stripe 90-day hold limit). */
  MILESTONE_PREFUND_LEAD_DAYS: 30,
} as const;
