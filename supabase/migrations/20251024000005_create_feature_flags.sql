create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default false,
  audience jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists feature_flags_updated_idx on feature_flags (updated_at desc);
