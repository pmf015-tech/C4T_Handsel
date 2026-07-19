import type { PayoutFailureClass } from "@/domain/payout/payout";

/**
 * Named money-failure classes — spec E4 (CEO review Finding 3).
 * No catch-all handlers: every Stripe failure is classified into exactly one
 * of these, recorded on the payout row, and surfaced to the admin queue.
 */

export class StripeChargeDeclinedError extends Error {
  readonly name = "StripeChargeDeclined";
  readonly failureClass: PayoutFailureClass = "StripeChargeDeclined";
  constructor(detail: string) {
    super(`Funding charge declined: ${detail}`);
  }
}

export class TransferFailedError extends Error {
  readonly name = "TransferFailed";
  readonly failureClass: PayoutFailureClass = "TransferFailed";
  constructor(detail: string) {
    super(`Creator transfer failed: ${detail}`);
  }
}

export class WebhookLostError extends Error {
  readonly name = "WebhookLost";
  readonly failureClass: PayoutFailureClass = "WebhookLost";
  constructor(detail: string) {
    super(`Webhook never arrived (reconciliation catch): ${detail}`);
  }
}

export class FundingWindowExceededError extends Error {
  readonly name = "FundingWindowExceeded";
  readonly failureClass: PayoutFailureClass = "FundingWindowExceeded";
  constructor(detail: string) {
    super(`Funding window exceeded: ${detail}`);
  }
}

export type NamedStripeError =
  | StripeChargeDeclinedError
  | TransferFailedError
  | WebhookLostError
  | FundingWindowExceededError;
