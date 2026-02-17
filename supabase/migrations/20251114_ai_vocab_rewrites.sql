-- Table: ai_vocab_rewrites
create table if not exists public.ai_vocab_rewrites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_text text not null,
  improved_text text not null,
  band_target text not null,
  module text not null check (module in ('writing', 'speaking')),
  model text,
  created_at timestamptz not null default now()
);

-- Index for fast per-user per-day lookups
create index if not exists idx_ai_vocab_rewrites_user_day
  on public.ai_vocab_rewrites (user_id, created_at);

-- Simple RLS: user can only see/insert their own logs
alter table public.ai_vocab_rewrites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_vocab_rewrites'
      and policyname = 'ai_vocab_rewrites_owner_rw'
  ) then
    create policy ai_vocab_rewrites_owner_rw
      on public.ai_vocab_rewrites
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

-- View: per-user rewrites for "today" (UTC)
create or replace view public.v_ai_vocab_rewrite_usage_today as
select
  user_id,
  count(*)::int as rewrites_today
from public.ai_vocab_rewrites
where created_at >= date_trunc('day', now() at time zone 'utc')
group by user_id;
