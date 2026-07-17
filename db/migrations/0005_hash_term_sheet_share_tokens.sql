drop trigger if exists term_sheet_versions_no_update on term_sheet_versions;

alter table term_sheet_versions
  add column share_token_hash char(64);

update term_sheet_versions
set share_token_hash = encode(sha256(convert_to(share_token, 'UTF8')), 'hex');

alter table term_sheet_versions
  alter column share_token_hash set not null,
  add constraint term_sheet_versions_share_token_hash_key unique (share_token_hash),
  drop column share_token;

create trigger term_sheet_versions_no_update before update on term_sheet_versions for each row execute function reject_term_sheet_versions_mutation();
