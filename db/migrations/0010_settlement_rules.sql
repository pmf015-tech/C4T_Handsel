-- E8: Gemini settlement agent — extracted rules, human-confirmed once.
-- Agent decisions are logged to deal_events (append-only); this table holds
-- only the current confirmed projection per deal.

create table if not exists settlement_rules (
  deal_id uuid primary key references deals(id),
  rules jsonb not null,
  model text not null,
  proposed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by_clerk_user_id text
);
