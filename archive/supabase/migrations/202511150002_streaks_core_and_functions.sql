-- File: supabase/migrations/202511150002_streaks_core_and_functions.sql
-- Purpose: streaks table + last_activity_at + core functions (Phase 1 - File 2)

-- 1. Ensure streaks table exists
create table if not exists public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current integer not null default 0,
  longest integer not null default 0,
  last_activity_at timestamptz null
);

comment on table public.streaks is
  'Per-user snapshot of streak state (current / longest / last_activity_at).';

-- 2. Make sure required columns exist (safe if table already existed)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'streaks'
      and column_name  = 'current'
  ) then
    alter table public.streaks
      add column current integer not null default 0;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'streaks'
      and column_name  = 'longest'
  ) then
    alter table public.streaks
      add column longest integer not null default 0;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'streaks'
      and column_name  = 'last_activity_at'
  ) then
    alter table public.streaks
      add column last_activity_at timestamptz null;
  end if;
end$$;

-- 3. RLS on streaks (user sees only their row)
alter table public.streaks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'streaks'
      and policyname = 'Users can view own streak'
  ) then
    create policy "Users can view own streak"
      on public.streaks
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

-- 4. Function: update_streak_for_user
--   - Pure calendar-day logic in UTC
--   - NO 24h kill logic here (that happens in /api/streak)
drop function if exists public.update_streak_for_user(uuid, timestamptz);

create or replace function public.update_streak_for_user(
  p_user_id uuid,
  p_ts      timestamptz
)
returns void
language plpgsql
as $$
declare
  v_effective_ts        timestamptz := coalesce(p_ts, now());
  v_date                date        := (v_effective_ts at time zone 'UTC')::date;

  v_prev_current        integer;
  v_prev_longest        integer;
  v_prev_last_activity  timestamptz;
  v_prev_date           date;

  v_new_current         integer;
  v_new_longest         integer;
begin
  -- Lock the row if it exists to avoid race conditions from concurrent inserts
  select s.current, s.longest, s.last_activity_at
  into v_prev_current, v_prev_longest, v_prev_last_activity
  from public.streaks s
  where s.user_id = p_user_id
  for update;

  if not found then
    -- First ever activity for this user
    v_new_current := 1;
    v_new_longest := 1;
  else
    if v_prev_last_activity is not null then
      v_prev_date := (v_prev_last_activity at time zone 'UTC')::date;
    else
      v_prev_date := null;
    end if;

    if v_prev_date is null then
      -- We had a row but no last_activity_at for some reason
      v_new_current := 1;

    elsif v_date = v_prev_date then
      -- Same UTC calendar day -> streak count unchanged
      v_new_current := v_prev_current;

    elsif v_date = v_prev_date + interval '1 day' then
      -- Next UTC calendar day -> streak continues
      v_new_current := coalesce(v_prev_current, 0) + 1;

    elsif v_date > v_prev_date + interval '1 day' then
      -- Gap of 2+ days -> streak resets to 1
      v_new_current := 1;

    else
      -- v_date < v_prev_date (out-of-order/old event) -> ignore for streak progression
      v_new_current := v_prev_current;
    end if;

    v_new_longest := greatest(coalesce(v_prev_longest, 0), v_new_current);
  end if;

  -- For the first-row case we might not have set v_new_longest yet
  if v_new_longest is null then
    v_new_longest := v_new_current;
  end if;

  insert into public.streaks as s (user_id, current, longest, last_activity_at)
  values (p_user_id, v_new_current, v_new_longest, v_effective_ts)
  on conflict (user_id) do update
    set current         = excluded.current,
        longest         = excluded.longest,
        last_activity_at = excluded.last_activity_at;
end;
$$;

comment on function public.update_streak_for_user(uuid, timestamptz) is
  'Update per-user streak snapshot based on new study activity timestamp; calendar-day based, no 24h kill logic.';

-- 5. Function: log_study_activity
--   - Single entry point for all triggers
--   - Inserts into study_activity_log, then calls update_streak_for_user
drop function if exists public.log_study_activity(uuid, timestamptz, text, uuid);

create or replace function public.log_study_activity(
  p_user_id uuid,
  p_ts      timestamptz,
  p_source  text,
  p_ref_id  uuid
)
returns void
language plpgsql
as $$
declare
  v_effective_ts timestamptz := coalesce(p_ts, now());
begin
  insert into public.study_activity_log (user_id, created_at, source, ref_id)
  values (p_user_id, v_effective_ts, p_source, p_ref_id);

  perform public.update_streak_for_user(p_user_id, v_effective_ts);
end;
$$;

comment on function public.log_study_activity(uuid, timestamptz, text, uuid) is
  'Shared helper to record a study activity event and update streak snapshot.';
