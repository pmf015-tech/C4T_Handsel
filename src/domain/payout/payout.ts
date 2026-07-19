/**
 * Milestone payout state machine — spec-handsel-mvp.md E4.
 *
 *  NOT_FUNDED ──beginFunding──▶ FUNDING_PENDING ──confirmFunded──▶ FUNDED
 *                                    │ failFunding                   │ beginRelease
 *                                    ▼                               ▼
 *                              FUNDING_FAILED ──retry(≤3)──▶   RELEASE_PENDING ──confirmReleased──▶ RELEASED
 *                                                                    │ failRelease                  (terminal)
 *                                                                    ▼
 *                                                              RELEASE_FAILED ──retry(≤3)──▶ …
 *
 * Pure module: no I/O, timestamps injected, mirrors milestone.ts. Every
 * transition returns the next projection plus the event fact the lib layer
 * must append to deal_events. Intent events are emitted BEFORE the Stripe
 * call and confirmations after (spec E4: intent/settled dual events).
 * confirmFunded / confirmReleased are idempotent so webhook replays and the
 * reconciliation sweep can never double-apply money movements.
 */

export type PayoutState =
  | "NOT_FUNDED"
  | "FUNDING_PENDING"
  | "FUNDING_FAILED"
  | "FUNDED"
  | "RELEASE_PENDING"
  | "RELEASE_FAILED"
  | "RELEASED";

/** Named money-failure classes — spec E4 (no catch-all handlers). */
export type PayoutFailureClass =
  | "StripeChargeDeclined"
  | "TransferFailed"
  | "WebhookLost"
  | "FundingWindowExceeded";

export const MAX_MONEY_ATTEMPTS = 3;

export type PayoutProjection = Readonly<{
  readonly id: string;
  readonly milestoneId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly state: PayoutState;
  readonly fundingAttempts: number;
  readonly releaseAttempts: number;
  readonly failureClass: PayoutFailureClass | null;
}>;

export type PayoutEvent = Readonly<{
  readonly eventType:
    | "PAYOUT_FUNDING_INTENT"
    | "PAYOUT_FUNDED"
    | "PAYOUT_FUNDING_FAILED"
    | "PAYOUT_RELEASE_INTENT"
    | "PAYOUT_RELEASED"
    | "PAYOUT_RELEASE_FAILED";
  readonly actorRole: "brand" | "system";
  readonly occurredAt: Date;
  readonly reason?: string;
}>;

export type PayoutTransition = Readonly<{
  readonly payout: PayoutProjection;
  readonly event: PayoutEvent | null;
}>;

export class InvalidPayoutTransitionError extends Error {
  readonly name = "InvalidPayoutTransitionError";
  constructor(from: PayoutState, action: string) {
    super(`Cannot ${action} a payout in state ${from}.`);
  }
}

export class PayoutAmountError extends Error {
  readonly name = "PayoutAmountError";
  constructor(amountMinor: number) {
    super(
      `Payout amount must be a positive integer of minor units; got ${amountMinor}.`,
    );
  }
}

/** Attempt cap reached — operation must land in the admin queue (E7). */
export class PayoutRetryLimitError extends Error {
  readonly name = "PayoutRetryLimitError";
  constructor(action: string) {
    super(
      `Retry limit of ${MAX_MONEY_ATTEMPTS} reached for ${action}; escalate to admin queue.`,
    );
  }
}

export function beginFunding(
  payout: PayoutProjection,
  now: Date,
): PayoutTransition {
  if (!Number.isInteger(payout.amountMinor) || payout.amountMinor <= 0)
    throw new PayoutAmountError(payout.amountMinor);
  if (payout.state !== "NOT_FUNDED" && payout.state !== "FUNDING_FAILED")
    throw new InvalidPayoutTransitionError(payout.state, "fund");
  if (payout.fundingAttempts >= MAX_MONEY_ATTEMPTS)
    throw new PayoutRetryLimitError("funding");
  return {
    payout: {
      ...payout,
      state: "FUNDING_PENDING",
      fundingAttempts: payout.fundingAttempts + 1,
      failureClass: null,
    },
    event: {
      eventType: "PAYOUT_FUNDING_INTENT",
      actorRole: "brand",
      occurredAt: now,
    },
  };
}

export function confirmFunded(
  payout: PayoutProjection,
  now: Date,
): PayoutTransition {
  if (payout.state === "FUNDED") return { payout, event: null };
  if (payout.state !== "FUNDING_PENDING")
    throw new InvalidPayoutTransitionError(payout.state, "confirm funding for");
  return {
    payout: { ...payout, state: "FUNDED", failureClass: null },
    event: { eventType: "PAYOUT_FUNDED", actorRole: "system", occurredAt: now },
  };
}

export function failFunding(
  payout: PayoutProjection,
  failureClass: PayoutFailureClass,
  now: Date,
): PayoutTransition {
  if (payout.state !== "FUNDING_PENDING")
    throw new InvalidPayoutTransitionError(payout.state, "fail funding for");
  return {
    payout: { ...payout, state: "FUNDING_FAILED", failureClass },
    event: {
      eventType: "PAYOUT_FUNDING_FAILED",
      actorRole: "system",
      occurredAt: now,
      reason: failureClass,
    },
  };
}

export function beginRelease(
  payout: PayoutProjection,
  now: Date,
): PayoutTransition {
  if (payout.state !== "FUNDED" && payout.state !== "RELEASE_FAILED")
    throw new InvalidPayoutTransitionError(payout.state, "release");
  if (payout.releaseAttempts >= MAX_MONEY_ATTEMPTS)
    throw new PayoutRetryLimitError("release");
  return {
    payout: {
      ...payout,
      state: "RELEASE_PENDING",
      releaseAttempts: payout.releaseAttempts + 1,
      failureClass: null,
    },
    event: {
      eventType: "PAYOUT_RELEASE_INTENT",
      actorRole: "system",
      occurredAt: now,
    },
  };
}

export function confirmReleased(
  payout: PayoutProjection,
  now: Date,
): PayoutTransition {
  if (payout.state === "RELEASED") return { payout, event: null };
  if (payout.state !== "RELEASE_PENDING")
    throw new InvalidPayoutTransitionError(payout.state, "confirm release for");
  return {
    payout: { ...payout, state: "RELEASED", failureClass: null },
    event: {
      eventType: "PAYOUT_RELEASED",
      actorRole: "system",
      occurredAt: now,
    },
  };
}

export function failRelease(
  payout: PayoutProjection,
  failureClass: PayoutFailureClass,
  now: Date,
): PayoutTransition {
  if (payout.state !== "RELEASE_PENDING")
    throw new InvalidPayoutTransitionError(payout.state, "fail release for");
  return {
    payout: { ...payout, state: "RELEASE_FAILED", failureClass },
    event: {
      eventType: "PAYOUT_RELEASE_FAILED",
      actorRole: "system",
      occurredAt: now,
      reason: failureClass,
    },
  };
}
