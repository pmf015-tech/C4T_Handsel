create table if not exists term_sheet_versions (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  version_number integer not null check (version_number > 0),
  content_hash char(64) not null,
  share_token text not null unique check (char_length(share_token) >= 32),
  content jsonb not null,
  expires_at timestamptz not null,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  unique (deal_id, version_number)
);

create index if not exists term_sheet_versions_deal_id_idx on term_sheet_versions (deal_id, version_number desc);

create or replace function reject_term_sheet_versions_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'term_sheet_versions is immutable';
end;
$$;

drop trigger if exists term_sheet_versions_no_update on term_sheet_versions;
create trigger term_sheet_versions_no_update before update on term_sheet_versions for each row execute function reject_term_sheet_versions_mutation();
drop trigger if exists term_sheet_versions_no_delete on term_sheet_versions;
create trigger term_sheet_versions_no_delete before delete on term_sheet_versions for each row execute function reject_term_sheet_versions_mutation();
