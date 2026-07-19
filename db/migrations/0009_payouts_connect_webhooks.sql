-- E4: milestone payouts (escrow), Stripe Connect accounts, webhook idempotency.
-- State values mirror src/domain/payout/payout.ts (single source of truth).

create table if not exists connect_accounts (
  clerk_user_id text primary key,
  stripe_account_id text not null unique,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists milestone_payouts (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  milestone_id uuid not null references deal_milestones(id) unique,
  amount_minor_units bigint not null check (
    amount_minor_units > 0 and amount_minor_units <= 9007199254740991
  ),
  currency text not null default 'hkd',
  state text not null default 'NOT_FUNDED' check (state in (
    'NOT_FUNDED', 'FUNDING_PENDING', 'FUNDING_FAILED',
    'FUNDED', 'RELEASE_PENDING', 'RELEASE_FAILED', 'RELEASED'
  )),
  funding_attempts integer not null default 0,
  release_attempts integer not null default 0,
  failure_class text check (failure_class in (
    'StripeChargeDeclined', 'TransferFailed', 'WebhookLost', 'FundingWindowExceeded'
  )),
  stripe_payment_intent_id text unique,
  stripe_transfer_id text unique,
  funding_intent_at timestamptz,
  funded_at timestamptz,
  release_intent_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists milestone_payouts_deal_idx
  on milestone_payouts (deal_id, state);

-- Reconciliation sweep scans for intents that never settled (spec E4:
-- intent/settled mismatch after 24h -> alert).
create index if not exists milestone_payouts_pending_idx
  on milestone_payouts (state, updated_at)
  where state in ('FUNDING_PENDING', 'RELEASE_PENDING');

create table if not exists stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);
