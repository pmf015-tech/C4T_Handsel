import type { Sql } from "postgres";
import Stripe from "stripe";

import {
  beginFunding,
  beginRelease,
  confirmFunded,
  confirmReleased,
  failFunding,
  failRelease,
  type PayoutFailureClass,
} from "@/domain/payout/payout";
import {
  lockOrCreatePayoutForMilestone,
  lockPayoutById,
  persistPayoutTransition,
  PayoutNotFoundError,
  type PayoutRow,
} from "@/lib/db/payouts";

import { getStripe } from "./client";
import { findConnectAccount } from "./connect";
import { StripeChargeDeclinedError, TransferFailedError } from "./errors";

export class CreatorNotOnboardedError extends Error {
  readonly name = "CreatorNotOnboardedError";
  constructor() {
    super("Creator has not completed Stripe Connect onboarding.");
  }
}

export class MilestoneNotApprovedError extends Error {
  readonly name = "MilestoneNotApprovedError";
  constructor() {
    super("Payout can only be released for an APPROVED milestone.");
  }
}

function classifyStripeError(
  error: unknown,
  fallback: PayoutFailureClass,
): PayoutFailureClass {
  if (error instanceof Stripe.errors.StripeCardError)
    return "StripeChargeDeclined";
  return fallback;
}

/**
 * Brand funds a milestone into escrow via a hosted Stripe Checkout page.
 * Intent event is committed BEFORE the Stripe call (spec E4); the
 * PaymentIntent id is attached by the webhook using metadata.payout_id.
 */
export async function fundMilestone(
  sql: Sql,
  input: {
    dealId: string;
    milestoneId: string;
    actorClerkUserId: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<{ url: string; payoutId: string }> {
  const now = new Date();

  // Step 1: record intent atomically (state -> FUNDING_PENDING).
  const intent = await sql.begin(async (transaction) => {
    const payout = await lockOrCreatePayoutForMilestone(
      transaction,
      input.dealId,
      input.milestoneId,
    );
    if (!payout) throw new PayoutNotFoundError();
    const transition = beginFunding(payout, now);
    await persistPayoutTransition(
      transaction,
      input.dealId,
      input.actorClerkUserId,
      transition,
    );
    return { ...payout, ...transition.payout };
  });

  // Step 2: Stripe call outside the transaction; outcome recorded after.
  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: intent.currency,
              unit_amount: intent.amountMinor,
              product_data: {
                name: `Handsel milestone escrow ${input.milestoneId.slice(0, 8)}`,
              },
            },
          },
        ],
        payment_intent_data: {
          transfer_group: intent.id,
          metadata: {
            payout_id: intent.id,
            deal_id: input.dealId,
            milestone_id: input.milestoneId,
          },
        },
        metadata: { payout_id: intent.id },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      { idempotencyKey: `fund-${intent.id}-attempt-${intent.fundingAttempts}` },
    );
    if (!session.url)
      throw new StripeChargeDeclinedError("Checkout session has no URL");
    return { url: session.url, payoutId: intent.id };
  } catch (error: unknown) {
    const failureClass = classifyStripeError(error, "StripeChargeDeclined");
    await sql.begin(async (transaction) => {
      const payout = await lockOrCreatePayoutForMilestone(
        transaction,
        input.dealId,
        input.milestoneId,
      );
      if (!payout || payout.state !== "FUNDING_PENDING") return;
      await persistPayoutTransition(
        transaction,
        input.dealId,
        "system:stripe",
        failFunding(payout, failureClass, new Date()),
      );
    });
    throw error instanceof Error
      ? error
      : new StripeChargeDeclinedError(String(error));
  }
}

/** Webhook/reconciliation path: mark a payout FUNDED. Idempotent. */
export async function confirmFundedPayout(
  sql: Sql,
  payoutId: string,
  paymentIntentId: string,
): Promise<PayoutRow | null> {
  return sql.begin(async (transaction) => {
    const payout = await lockPayoutById(transaction, payoutId);
    if (!payout) return null;
    const transition = confirmFunded(payout, new Date());
    await persistPayoutTransition(
      transaction,
      payout.dealId,
      "system:stripe-webhook",
      transition,
      { paymentIntentId },
    );
    return { ...payout, ...transition.payout };
  });
}

/**
 * Release escrowed funds to the creator once the milestone is APPROVED.
 * Transfer idempotency key includes the attempt counter recorded in the
 * intent event, so a retried release can never double-transfer (spec E4
 * acceptance criterion 2).
 */
export async function releasePayout(
  sql: Sql,
  input: {
    dealId: string;
    milestoneId: string;
    creatorClerkUserId: string;
    actorClerkUserId: string;
  },
): Promise<PayoutRow> {
  const connect = await findConnectAccount(sql, input.creatorClerkUserId);
  if (!connect?.onboardingComplete) throw new CreatorNotOnboardedError();

  const now = new Date();
  const intent = await sql.begin(async (transaction) => {
    const rows = await transaction`
      select state from deal_milestones
      where id = ${input.milestoneId} and deal_id = ${input.dealId}
    `;
    if (rows[0]?.state !== "APPROVED") throw new MilestoneNotApprovedError();

    const payout = await lockOrCreatePayoutForMilestone(
      transaction,
      input.dealId,
      input.milestoneId,
    );
    if (!payout) throw new PayoutNotFoundError();
    const transition = beginRelease(payout, now);
    await persistPayoutTransition(
      transaction,
      input.dealId,
      input.actorClerkUserId,
      transition,
    );
    return { ...payout, ...transition.payout };
  });

  try {
    const transfer = await getStripe().transfers.create(
      {
        amount: intent.amountMinor,
        currency: intent.currency,
        destination: connect.stripeAccountId,
        transfer_group: intent.id,
        metadata: { payout_id: intent.id, milestone_id: input.milestoneId },
      },
      {
        idempotencyKey: `release-${intent.id}-attempt-${intent.releaseAttempts}`,
      },
    );
    return await sql.begin(async (transaction) => {
      const payout = await lockOrCreatePayoutForMilestone(
        transaction,
        input.dealId,
        input.milestoneId,
      );
      if (!payout) throw new PayoutNotFoundError();
      const transition = confirmReleased(payout, new Date());
      await persistPayoutTransition(
        transaction,
        input.dealId,
        "system:stripe",
        transition,
        { transferId: transfer.id },
      );
      return { ...payout, ...transition.payout };
    });
  } catch (error: unknown) {
    await sql.begin(async (transaction) => {
      const payout = await lockOrCreatePayoutForMilestone(
        transaction,
        input.dealId,
        input.milestoneId,
      );
      if (!payout || payout.state !== "RELEASE_PENDING") return;
      await persistPayoutTransition(
        transaction,
        input.dealId,
        "system:stripe",
        failRelease(
          payout,
          classifyStripeError(error, "TransferFailed"),
          new Date(),
        ),
      );
    });
    throw error instanceof Error
      ? error
      : new TransferFailedError(String(error));
  }
}
