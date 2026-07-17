create table if not exists deal_milestones (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  position smallint not null check (position between 1 and 20),
  title text not null check (char_length(btrim(title)) between 2 and 80),
  amount_minor_units bigint not null check (
    amount_minor_units between 1 and 9007199254740991
  ),
  due_date date not null,
  created_at timestamptz not null default now(),
  unique (deal_id, position)
);

create unique index if not exists deal_milestones_deal_title_idx
  on deal_milestones (deal_id, lower(btrim(title)));

create index if not exists deal_milestones_deal_order_idx
  on deal_milestones (deal_id, position);
