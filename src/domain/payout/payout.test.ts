import { describe, expect, it } from "vitest";

import {
  beginFunding,
  beginRelease,
  confirmFunded,
  confirmReleased,
  failFunding,
  failRelease,
  InvalidPayoutTransitionError,
  MAX_MONEY_ATTEMPTS,
  PayoutAmountError,
  PayoutRetryLimitError,
  type PayoutProjection,
} from "./payout";

const T0 = new Date("2026-07-19T10:00:00Z");
const T1 = new Date("2026-07-19T11:00:00Z");

function payout(overrides: Partial<PayoutProjection> = {}): PayoutProjection {
  return {
    id: "po_1",
    milestoneId: "ms_1",
    amountMinor: 750_000,
    currency: "hkd",
    state: "NOT_FUNDED",
    fundingAttempts: 0,
    releaseAttempts: 0,
    failureClass: null,
    ...overrides,
  };
}

describe("beginFunding", () => {
  it("moves NOT_FUNDED to FUNDING_PENDING and emits an intent event", () => {
    const { payout: next, event } = beginFunding(payout(), T0);
    expect(next.state).toBe("FUNDING_PENDING");
    expect(next.fundingAttempts).toBe(1);
    expect(event?.eventType).toBe("PAYOUT_FUNDING_INTENT");
    expect(event?.occurredAt).toBe(T0);
  });

  it("retries from FUNDING_FAILED below the attempt cap", () => {
    const failed = payout({ state: "FUNDING_FAILED", fundingAttempts: 2 });
    const { payout: next } = beginFunding(failed, T0);
    expect(next.state).toBe("FUNDING_PENDING");
    expect(next.fundingAttempts).toBe(3);
    expect(next.failureClass).toBeNull();
  });

  it("throws PayoutRetryLimitError at the attempt cap", () => {
    const failed = payout({
      state: "FUNDING_FAILED",
      fundingAttempts: MAX_MONEY_ATTEMPTS,
    });
    expect(() => beginFunding(failed, T0)).toThrow(PayoutRetryLimitError);
  });

  it.each([
    "FUNDING_PENDING",
    "FUNDED",
    "RELEASE_PENDING",
    "RELEASED",
  ] as const)("rejects funding from %s", (state) => {
    expect(() => beginFunding(payout({ state }), T0)).toThrow(
      InvalidPayoutTransitionError,
    );
  });

  it("rejects a non-positive or non-integer amount", () => {
    expect(() => beginFunding(payout({ amountMinor: 0 }), T0)).toThrow(
      PayoutAmountError,
    );
    expect(() => beginFunding(payout({ amountMinor: 10.5 }), T0)).toThrow(
      PayoutAmountError,
    );
  });
});

describe("confirmFunded", () => {
  it("moves FUNDING_PENDING to FUNDED", () => {
    const pending = payout({ state: "FUNDING_PENDING", fundingAttempts: 1 });
    const { payout: next, event } = confirmFunded(pending, T1);
    expect(next.state).toBe("FUNDED");
    expect(event?.eventType).toBe("PAYOUT_FUNDED");
  });

  it("is idempotent when already FUNDED (webhook replay emits no event)", () => {
    const funded = payout({ state: "FUNDED" });
    const { payout: next, event } = confirmFunded(funded, T1);
    expect(next).toBe(funded);
    expect(event).toBeNull();
  });

  it("rejects confirmation from NOT_FUNDED", () => {
    expect(() => confirmFunded(payout(), T1)).toThrow(
      InvalidPayoutTransitionError,
    );
  });
});

describe("failFunding", () => {
  it("records the named failure class", () => {
    const pending = payout({ state: "FUNDING_PENDING", fundingAttempts: 1 });
    const { payout: next, event } = failFunding(
      pending,
      "StripeChargeDeclined",
      T1,
    );
    expect(next.state).toBe("FUNDING_FAILED");
    expect(next.failureClass).toBe("StripeChargeDeclined");
    expect(event?.eventType).toBe("PAYOUT_FUNDING_FAILED");
    expect(event?.reason).toBe("StripeChargeDeclined");
  });

  it("rejects failure from a non-pending state", () => {
    expect(() =>
      failFunding(payout({ state: "FUNDED" }), "StripeChargeDeclined", T1),
    ).toThrow(InvalidPayoutTransitionError);
  });
});

describe("release", () => {
  it("moves FUNDED to RELEASE_PENDING then RELEASED", () => {
    const funded = payout({ state: "FUNDED" });
    const { payout: pending, event: intent } = beginRelease(funded, T0);
    expect(pending.state).toBe("RELEASE_PENDING");
    expect(pending.releaseAttempts).toBe(1);
    expect(intent?.eventType).toBe("PAYOUT_RELEASE_INTENT");

    const { payout: released, event } = confirmReleased(pending, T1);
    expect(released.state).toBe("RELEASED");
    expect(event?.eventType).toBe("PAYOUT_RELEASED");
  });

  it("is idempotent when already RELEASED", () => {
    const done = payout({ state: "RELEASED" });
    const { payout: next, event } = confirmReleased(done, T1);
    expect(next).toBe(done);
    expect(event).toBeNull();
  });

  it("retries a failed release below the cap and stops at the cap", () => {
    const failed = payout({ state: "RELEASE_FAILED", releaseAttempts: 1 });
    const { payout: next } = beginRelease(failed, T0);
    expect(next.state).toBe("RELEASE_PENDING");
    expect(next.releaseAttempts).toBe(2);

    const capped = payout({
      state: "RELEASE_FAILED",
      releaseAttempts: MAX_MONEY_ATTEMPTS,
    });
    expect(() => beginRelease(capped, T0)).toThrow(PayoutRetryLimitError);
  });

  it.each(["NOT_FUNDED", "FUNDING_PENDING", "FUNDING_FAILED"] as const)(
    "rejects release from %s (funds not held)",
    (state) => {
      expect(() => beginRelease(payout({ state }), T0)).toThrow(
        InvalidPayoutTransitionError,
      );
    },
  );

  it("records TransferFailed on release failure", () => {
    const pending = payout({ state: "RELEASE_PENDING", releaseAttempts: 1 });
    const { payout: next, event } = failRelease(pending, "TransferFailed", T1);
    expect(next.state).toBe("RELEASE_FAILED");
    expect(next.failureClass).toBe("TransferFailed");
    expect(event?.eventType).toBe("PAYOUT_RELEASE_FAILED");
  });
});
