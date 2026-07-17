-- E3: milestone deliver/approve state + monthly sales reports.
-- State values mirror src/domain/milestone/milestone.ts (single source of truth).

alter table deal_milestones
  add column if not exists state text not null default 'PENDING'
    check (state in ('PENDING', 'DELIVERED', 'APPROVED', 'FROZEN')),
  add column if not exists delivered_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists frozen_from_state text
    check (frozen_from_state in ('PENDING', 'DELIVERED', 'APPROVED'));

create index if not exists deal_milestones_state_idx
  on deal_milestones (deal_id, state);

create table if not exists sales_reports (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  period_end date not null,
  units integer not null check (units >= 0),
  gross_revenue_minor_units bigint not null check (
    gross_revenue_minor_units between 0 and 9007199254740991
  ),
  timing text not null check (timing in ('ON_TIME', 'LATE')),
  submitted_by_clerk_user_id text not null,
  submitted_at timestamptz not null default now(),
  unique (deal_id, period_end)
);

create index if not exists sales_reports_deal_period_idx
  on sales_reports (deal_id, period_end desc);
