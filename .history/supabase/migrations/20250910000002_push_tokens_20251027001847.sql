-- 20250910000002_push_tokens.sql
-- Push tokens + RLS (uses pgcrypto: gen_random_uuid())

-- Ensure pgcrypto is available (for gen_random_uuid)
create extension if not exists pgcrypto with schema public;

-- Main table
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text check (platform in ('ios','android','web')),
  device jsonb,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false,
  revoked_at timestamptz
);

-- RLS
alter table if exists public.push_tokens enable row level security;

do $$
begin
  create policy "Users select own push tokens"
    on public.push_tokens
    for select to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Users insert own push tokens"
    on public.push_tokens
    for insert to authenticated
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Users update own push tokens"
    on public.push_tokens
    for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end$$;

-- Optional convenience: bump last_used_at whenever token value changes
create or replace function public.touch_push_token_last_used()
returns trigger language plpgsql as $$
begin
  new.last_used_at := now();
  return new;
end$$;

drop trigger if exists touch_push_token_last_used on public.push_tokens;
create trigger touch_push_token_last_used
  before update of token on public.push_tokens
  for each row execute procedure public.touch_push_token_last_used();
