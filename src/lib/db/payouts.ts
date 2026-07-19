import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";

import type {
  PayoutProjection,
  PayoutTransition,
} from "@/domain/payout/payout";

const PayoutRowSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
  dealId: z.string().uuid(),
  amountMinor: z.coerce.number().int().positive(),
  currency: z.string().min(3),
  state: z.enum([
    "NOT_FUNDED",
    "FUNDING_PENDING",
    "FUNDING_FAILED",
    "FUNDED",
    "RELEASE_PENDING",
    "RELEASE_FAILED",
    "RELEASED",
  ]),
  fundingAttempts: z.number().int(),
  releaseAttempts: z.number().int(),
  failureClass: z
    .enum([
      "StripeChargeDeclined",
      "TransferFailed",
      "WebhookLost",
      "FundingWindowExceeded",
    ])
    .nullable(),
  stripePaymentIntentId: z.string().nullable(),
  stripeTransferId: z.string().nullable(),
});

export type PayoutRow = Readonly<z.infer<typeof PayoutRowSchema>> &
  PayoutProjection;

export class PayoutNotFoundError extends Error {
  readonly name = "PayoutNotFoundError";
  constructor() {
    super("Payout not found for this party.");
  }
}

const PAYOUT_COLUMNS = `
  id, milestone_id as "milestoneId", deal_id as "dealId",
  amount_minor_units as "amountMinor", currency, state,
  funding_attempts as "fundingAttempts", release_attempts as "releaseAttempts",
  failure_class as "failureClass",
  stripe_payment_intent_id as "stripePaymentIntentId",
  stripe_transfer_id as "stripeTransferId"
`;

/**
 * Load the payout row for a milestone, creating the NOT_FUNDED row lazily
 * from the milestone's amount. Row-locked so concurrent fund/webhook/cron
 * calls serialize (same pattern as the E3 auto-approve sweep).
 */
export async function lockOrCreatePayoutForMilestone(
  transaction: TransactionSql,
  dealId: string,
  milestoneId: string,
): Promise<PayoutRow | null> {
  await transaction`
    insert into milestone_payouts (id, deal_id, milestone_id, amount_minor_units, currency)
    select ${randomUUID()}, m.deal_id, m.id, m.amount_minor_units, 'hkd'
    from deal_milestones m
    where m.id = ${milestoneId} and m.deal_id = ${dealId}
    on conflict (milestone_id) do nothing
  `;
  const rows = await transaction.unsafe(
    `select ${PAYOUT_COLUMNS} from milestone_payouts
     where milestone_id = $1 and deal_id = $2 for update`,
    [milestoneId, dealId],
  );
  return rows[0] ? (PayoutRowSchema.parse(rows[0]) as PayoutRow) : null;
}

export async function lockPayoutById(
  transaction: TransactionSql,
  payoutId: string,
): Promise<PayoutRow | null> {
  const rows = await transaction.unsafe(
    `select ${PAYOUT_COLUMNS} from milestone_payouts
     where id = $1 for update`,
    [payoutId],
  );
  return rows[0] ? (PayoutRowSchema.parse(rows[0]) as PayoutRow) : null;
}

/** Persist a domain transition and append its event fact atomically. */
export async function persistPayoutTransition(
  transaction: TransactionSql,
  dealId: string,
  actorClerkUserId: string,
  transition: PayoutTransition,
  stripeRefs: {
    paymentIntentId?: string;
    transferId?: string;
  } = {},
): Promise<void> {
  const { payout, event } = transition;
  await transaction`
    update milestone_payouts set
      state = ${payout.state},
      funding_attempts = ${payout.fundingAttempts},
      release_attempts = ${payout.releaseAttempts},
      failure_class = ${payout.failureClass},
      stripe_payment_intent_id = coalesce(${stripeRefs.paymentIntentId ?? null}, stripe_payment_intent_id),
      stripe_transfer_id = coalesce(${stripeRefs.transferId ?? null}, stripe_transfer_id),
      funding_intent_at = case when ${payout.state} = 'FUNDING_PENDING' then now() else funding_intent_at end,
      funded_at = case when ${payout.state} = 'FUNDED' then coalesce(funded_at, now()) else funded_at end,
      release_intent_at = case when ${payout.state} = 'RELEASE_PENDING' then now() else release_intent_at end,
      released_at = case when ${payout.state} = 'RELEASED' then coalesce(released_at, now()) else released_at end,
      updated_at = now()
    where id = ${payout.id}
  `;
  if (event) {
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (
        ${randomUUID()}, ${dealId}, ${event.eventType}, ${actorClerkUserId},
        ${transaction.json({
          milestoneId: payout.milestoneId,
          payoutId: payout.id,
          amountMinor: payout.amountMinor,
          currency: payout.currency,
          reason: event.reason ?? null,
          paymentIntentId: stripeRefs.paymentIntentId ?? null,
          transferId: stripeRefs.transferId ?? null,
        })}
      )
    `;
  }
}

/** Read-only payout states for a deal, keyed by milestone id (UI projection). */
export async function findPayoutsForDeal(
  sql: Sql,
  dealId: string,
): Promise<ReadonlyMap<string, PayoutRow>> {
  const rows = await sql.unsafe(
    `select ${PAYOUT_COLUMNS} from milestone_payouts where deal_id = $1`,
    [dealId],
  );
  return new Map(
    rows.map((row) => {
      const payout = PayoutRowSchema.parse(row) as PayoutRow;
      return [payout.milestoneId, payout];
    }),
  );
}

/** Payouts whose Stripe intent never settled — reconciliation input (E4). */
export async function findStalePendingPayouts(
  sql: Sql,
  olderThanMinutes: number,
): Promise<readonly PayoutRow[]> {
  const rows = await sql.unsafe(
    `select ${PAYOUT_COLUMNS} from milestone_payouts
     where state in ('FUNDING_PENDING', 'RELEASE_PENDING')
       and updated_at < now() - ($1 || ' minutes')::interval`,
    [String(olderThanMinutes)],
  );
  return rows.map((row) => PayoutRowSchema.parse(row) as PayoutRow);
}
