-- 20251106_study_buddy_sessions.sql
-- Canonical table for Study Buddy feature

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 1) Table
create table if not exists public.study_buddy_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,   -- [{ "skill": "...", "minutes": 10 }]
  state text not null check (state in ('pending','started','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Helpful indexes
create index if not exists idx_sbs_user_created_at
  on public.study_buddy_sessions (user_id, created_at desc);
create index if not exists idx_sbs_state
  on public.study_buddy_sessions (state);

-- 3) RLS: owner-only access
alter table public.study_buddy_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'study_buddy_sessions'
      and policyname = 'sbs_select_own'
  ) then
    create policy sbs_select_own
      on public.study_buddy_sessions
      for select
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'study_buddy_sessions'
      and policyname = 'sbs_insert_self'
  ) then
    create policy sbs_insert_self
      on public.study_buddy_sessions
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'study_buddy_sessions'
      and policyname = 'sbs_update_own'
  ) then
    create policy sbs_update_own
      on public.study_buddy_sessions
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

-- 4) Auto-update updated_at
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sbs_touch_updated_at on public.study_buddy_sessions;
create trigger trg_sbs_touch_updated_at
before update on public.study_buddy_sessions
for each row execute function public.touch_updated_at();

-- ✅ No legacy "study_sessions" view created (Option A)
