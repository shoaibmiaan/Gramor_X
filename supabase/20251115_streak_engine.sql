-- 1) Study activity log (idempotent)
create table if not exists public.study_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  weight integer not null default 1,
  source text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

alter table public.study_activity_log
  enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_activity_log'
      and policyname = 'Users can see their own study activity'
  ) then
    create policy "Users can see their own study activity"
      on public.study_activity_log
      for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

-- 2) Streaks: ONLY ensure these columns exist. DO NOT touch FKs.
alter table public.streaks
  add column if not exists current integer default 0,
  add column if not exists longest integer default 0,
  add column if not exists last_active_date date;

-- 3) Functions (safe: create or replace)
create or replace function public.update_streak_for_user(
  p_user_id uuid,
  p_activity_date date
)
returns void
language plpgsql
security definer
as $$
declare
  v_row public.streaks%rowtype;
  v_today date := p_activity_date;
  v_yesterday date := p_activity_date - 1;
begin
  if p_user_id is null or p_activity_date is null then
    return;
  end if;

  select *
  into v_row
  from public.streaks
  where user_id = p_user_id;

  if not found then
    insert into public.streaks (user_id, current, longest, last_active_date)
    values (p_user_id, 1, 1, v_today)
    on conflict (user_id) do nothing;
    return;
  end if;

  if v_row.last_active_date is not null
     and p_activity_date <= v_row.last_active_date then
    return;
  end if;

  if v_row.last_active_date = v_yesterday then
    v_row.current := coalesce(v_row.current, 0) + 1;
  else
    v_row.current := 1;
  end if;

  v_row.longest := greatest(coalesce(v_row.longest, 0), v_row.current);
  v_row.last_active_date := v_today;

  update public.streaks
  set current = v_row.current,
      longest = v_row.longest,
      last_active_date = v_row.last_active_date
  where user_id = p_user_id;
end;
$$;

create or replace function public.log_study_activity(
  p_user_id uuid,
  p_ts timestamptz,
  p_source text,
  p_ref_id uuid default null,
  p_weight integer default 1
)
returns void
language plpgsql
security definer
as $$
declare
  v_activity_date date;
begin
  if p_user_id is null or p_ts is null then
    return;
  end if;

  v_activity_date := (p_ts at time zone 'Asia/Karachi')::date;

  insert into public.study_activity_log (user_id, activity_date, source, ref_id, weight)
  values (p_user_id, v_activity_date, p_source, p_ref_id, greatest(p_weight, 1));

  perform public.update_streak_for_user(p_user_id, v_activity_date);
end;
$$;

create or replace function public.get_streak_history(
  p_user_id uuid,
  p_days_back integer
)
returns table (
  date date,
  completed integer,
  total integer
)
language plpgsql
security definer
as $$
begin
  return query
  with days as (
    select (current_date - offs) as d
    from generate_series(0, greatest(p_days_back, 1) - 1) as offs
  ),
  activity as (
    select
      activity_date,
      sum(weight) as completed_units
    from public.study_activity_log
    where user_id = p_user_id
      and activity_date >= current_date - (p_days_back - 1)
      and activity_date <= current_date
    group by activity_date
  )
  select
    days.d as date,
    coalesce(activity.completed_units, 0) as completed,
    case when coalesce(activity.completed_units, 0) > 0 then 1 else 0 end as total
  from days
  left join activity on activity.activity_date = days.d
  order by date;
end;
$$;
