-- File: supabase/migrations/202511150001_study_activity_log.sql
-- Purpose: canonical study_activity_log table + RLS (Phase 1 - File 1)

-- 1. Extension (needed for gen_random_uuid)
create extension if not exists "pgcrypto";

-- 2. Canonical activity log table
create table if not exists public.study_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(), -- UTC event time
  source text not null,                           -- 'writing_attempt' | 'reading_attempt' | ...
  ref_id uuid null,                               -- source row id
  weight integer not null default 1
);

comment on table public.study_activity_log is
  'Canonical per-event study activity log used for streaks and analytics.';

comment on column public.study_activity_log.source is
  'Origin of the activity (writing_attempt, reading_attempt, listening_attempt, speaking_attempt, vocab_review, ...).';

-- 3. RLS: only own rows visible
alter table public.study_activity_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_activity_log'
      and policyname = 'Users can view own study activity'
  ) then
    create policy "Users can view own study activity"
      on public.study_activity_log
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

-- Optional: lock insert/update/delete to service roles only (not required by spec, so commented)
-- You can uncomment if you want tight control later.
-- do $$
-- begin
--   if not exists (
--     select 1 from pg_policies
--     where schemaname = 'public'
--       and tablename = 'study_activity_log'
--       and policyname = 'No direct writes from clients'
--   ) then
--     create policy "No direct writes from clients"
--       on public.study_activity_log
--       for all
--       using (false)
--       with check (false);
--   end if;
-- end$$;
