create table if not exists deals (
  id uuid primary key,
  title text not null check (char_length(title) between 2 and 80),
  counterparty_name text not null check (char_length(counterparty_name) between 2 and 80),
  currency text not null check (currency in ('HKD', 'TWD', 'USD')),
  creator_share_basis_points integer not null check (creator_share_basis_points between 1 and 9500),
  projected_revenue_minor_units bigint not null check (projected_revenue_minor_units > 0),
  total_milestone_amount_minor_units bigint not null check (total_milestone_amount_minor_units > 0),
  dispute_clause text not null check (dispute_clause in ('REFUND_BRAND', 'SPLIT_BY_DELIVERED_PROPORTION', 'EXTERNAL_MEDIATION')),
  state text not null check (state in ('DRAFT', 'NEGOTIATING', 'SIGNED', 'ACTIVE', 'MILESTONE_MET', 'PAYOUT_RELEASED', 'DISPUTED', 'RESOLVED', 'COMPLETED', 'CANCELLED')),
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deal_parties (
  deal_id uuid not null references deals(id),
  clerk_user_id text not null,
  role text not null check (role in ('creator', 'brand')),
  created_at timestamptz not null default now(),
  primary key (deal_id, clerk_user_id),
  unique (deal_id, role)
);

create table if not exists deal_events (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  event_type text not null,
  actor_clerk_user_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists deal_parties_clerk_user_id_idx on deal_parties (clerk_user_id);
create index if not exists deal_events_deal_id_created_at_idx on deal_events (deal_id, created_at);

create or replace function reject_deal_events_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'deal_events is append-only';
end;
$$;

drop trigger if exists deal_events_no_update on deal_events;
create trigger deal_events_no_update before update on deal_events for each row execute function reject_deal_events_mutation();
drop trigger if exists deal_events_no_delete on deal_events;
create trigger deal_events_no_delete before delete on deal_events for each row execute function reject_deal_events_mutation();
