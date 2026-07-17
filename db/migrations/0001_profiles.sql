create table if not exists profiles (
  id uuid primary key,
  clerk_user_id text not null unique,
  role text not null check (role in ('creator', 'brand')),
  display_name text not null check (char_length(display_name) between 2 and 46),
  preferred_language text not null check (preferred_language in ('en', 'zh-Hant')),
  niche text,
  follower_count integer,
  engagement_rate_basis_points integer,
  socials jsonb not null default '[]'::jsonb,
  product_category text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_fields_check check (
    (
      role = 'creator'
      and niche is not null
      and follower_count between 0 and 500000000
      and engagement_rate_basis_points between 0 and 10000
      and product_category is null
      and website is null
    )
    or
    (
      role = 'brand'
      and product_category is not null
      and website is not null
      and niche is null
      and follower_count is null
      and engagement_rate_basis_points is null
      and socials = '[]'::jsonb
    )
  )
);

create index if not exists profiles_clerk_user_id_idx
  on profiles (clerk_user_id);
