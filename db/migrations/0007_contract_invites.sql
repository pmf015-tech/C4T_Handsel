create table if not exists contract_invites (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  contract_version_id uuid not null references contract_versions(id),
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  accepted_clerk_user_id text,
  accepted_at timestamptz,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists contract_invites_deal_id_idx on contract_invites (deal_id, created_at desc);
