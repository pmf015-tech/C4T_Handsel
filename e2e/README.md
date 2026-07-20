# E2E (Playwright)

Critical-path journeys against Stripe **test mode** — no mocked Stripe
(CLAUDE.md testing expectation).

## Journeys

- `prototype.spec.ts` — landing page smoke test (runs everywhere, no secrets).
- `critical-path.spec.ts` — spec Testing Plan journey 1, fully through the UI:
  create deal → term sheet → both parties click-sign (invite link) → milestone
  deliver/approve → fund via real Stripe Checkout (test card) → WebhookLost
  repair via the reconcile cron → release transfer to the creator → assert the
  append-only event log tells the whole story.

Remaining planned journeys (spec Testing Plan, 8 total): dispute freeze path;
redline signature-reset path; funding-declined path.

## Requirements for the critical-path journey

Skips itself unless all of these are present (loaded from `.env.local`):

- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — **dev instance**
  (`pk_test`). Global setup idempotently creates two `+clerk_test` users that
  sign in with Clerk's fixed dev verification code; no real credentials.
- `STRIPE_SECRET_KEY` — test mode, Connect enabled.
- `DATABASE_URL` — the local/dev database the dev server uses.
- `CRON_SECRET` — for the reconcile cron call.

Run against an already-running dev server (recommended — first-compile latency
is what the 30s client timeout exists for):

```bash
PLAYWRIGHT_BASE_URL=http://localhost:<port> npx playwright test
```

Without `PLAYWRIGHT_BASE_URL`, Playwright boots its own dev server on :3100.

## Test-mode fixtures the journey uses

- Creator payout destination: reuses any Connect account whose `transfers`
  capability is active, else creates a prefilled test Custom account (Stripe
  magic test values). Registered to the creator via `connect_accounts`.
- Available balance for the transfer is topped up with `pm_card_bypassPending`.
- WebhookLost is simulated by ageing the payout 31 minutes and invoking the
  reconcile cron, which repairs state from Stripe by metadata search (the
  search index is eventually consistent, hence the polling loop).
