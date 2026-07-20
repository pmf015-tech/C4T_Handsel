# Sandbox E4 escrow runbook

Manual, no-mock end-to-end proof of the milestone escrow flow (spec E4) against
**Stripe test mode** and a dedicated local Postgres. It exercises the same
`src/lib/stripe` and `src/domain/payout` code the app uses — nothing is stubbed.

Not part of CI: `escrow-sandbox.integration.test.ts` self-skips unless
`SANDBOX_E2E` names a step, so `npm run test:integration` stays unaffected.

## Prerequisites

- `.env.local` with a Connect-enabled `STRIPE_SECRET_KEY=sk_test_...` and a
  `DATABASE_URL` pointing at the dedicated local test database.
- Dev server running (for the reconcile cron HTTP call and checkout redirects).
  Pass its port via `SANDBOX_APP_URL` (default `http://localhost:53100`).

## Steps

Run each step, doing the browser action it prints between steps. State is shared
through `/tmp/handsel-sandbox-e2e.json`.

```bash
# 1. Seed a signed deal + open a funding Checkout. Prints CHECKOUT_URL.
SANDBOX_E2E=step1 SANDBOX_APP_URL=http://localhost:PORT \
  npm run test:integration -- src/sandbox/escrow-sandbox.integration.test.ts
#    -> pay CHECKOUT_URL with test card 4242 4242 4242 4242.

# 2. Simulate a lost webhook: the reconcile cron recovers the PaymentIntent
#    from Stripe by metadata and marks the payout FUNDED (spec E4 criterion 2).
SANDBOX_E2E=step2 ... (same flags)

# 3a. Create the creator's Connect account + print an onboarding URL.
SANDBOX_E2E=step3a ...
#    -> complete onboarding with Stripe test values.

# 3b. Release the escrowed transfer to the creator and dump the deal event log.
SANDBOX_E2E=step3b ...
```

## What it proves (spec E4 acceptance criteria)

1. Fund → approve → transfer lands in the creator's test account; every step is
   in the append-only deal event log.
2. With **no webhook endpoint at all** (the worst WebhookLost case), the
   reconcile cron repairs state to FUNDED within one cycle.
3. A failed release is recorded as `PAYOUT_RELEASE_FAILED` with no state
   corruption, and a retry succeeds.
4. Idempotency: repeated release intents produce exactly **one** Stripe transfer
   (the idempotency key carries the attempt counter).

### Topping up the test available balance

Transfers need available funds. Create a charge with the special test card
`4000 0000 0000 0077` (or a PaymentIntent with `pm_card_bypassPending`) to move
test funds straight to the available balance before running step 3b.
