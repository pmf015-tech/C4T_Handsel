-- E5: public deal history. A deal is public unless either party opts out.

alter table deals
  add column if not exists is_public boolean not null default true;

create index if not exists deals_public_idx on deals (is_public) where is_public;
