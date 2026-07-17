create table if not exists contract_versions (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  source_term_sheet_version_id uuid not null references term_sheet_versions(id),
  version_number integer not null check (version_number > 0),
  content_hash char(64) not null,
  content jsonb not null,
  signing_expires_at timestamptz not null,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  unique (deal_id, version_number)
);

create index if not exists contract_versions_deal_id_idx
  on contract_versions (deal_id, version_number desc);

create table if not exists contract_signatures (
  id uuid primary key,
  contract_version_id uuid not null references contract_versions(id),
  deal_id uuid not null references deals(id),
  clerk_user_id text not null,
  party_role text not null check (party_role in ('creator', 'brand')),
  content_hash char(64) not null,
  signed_at timestamptz not null default now(),
  unique (contract_version_id, party_role),
  unique (contract_version_id, clerk_user_id)
);

create index if not exists contract_signatures_deal_id_idx
  on contract_signatures (deal_id, signed_at desc);

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

create or replace function reject_contract_versions_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'contract_versions is immutable';
end;
$$;

drop trigger if exists contract_versions_no_update on contract_versions;
create trigger contract_versions_no_update before update on contract_versions for each row execute function reject_contract_versions_mutation();
drop trigger if exists contract_versions_no_delete on contract_versions;
create trigger contract_versions_no_delete before delete on contract_versions for each row execute function reject_contract_versions_mutation();

create or replace function reject_contract_signatures_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'contract_signatures is immutable';
end;
$$;

drop trigger if exists contract_signatures_no_update on contract_signatures;
create trigger contract_signatures_no_update before update on contract_signatures for each row execute function reject_contract_signatures_mutation();
drop trigger if exists contract_signatures_no_delete on contract_signatures;
create trigger contract_signatures_no_delete before delete on contract_signatures for each row execute function reject_contract_signatures_mutation();
