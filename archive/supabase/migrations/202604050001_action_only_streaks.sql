-- Action-only streak schema support

create table if not exists public.streak_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_key date not null,
  activity_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists streak_activity_log_user_day_activity_uq
  on public.streak_activity_log (user_id, day_key, activity_type);

create index if not exists streak_activity_log_user_day_idx
  on public.streak_activity_log (user_id, day_key desc);

alter table public.streaks
  add column if not exists date date,
  add column if not exists current_streak integer,
  add column if not exists longest_streak integer,
  add column if not exists activity_type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists streaks_user_date_activity_uq
  on public.streaks (user_id, date, activity_type)
  where date is not null and activity_type is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists streak_activity_log_touch_updated_at on public.streak_activity_log;
create trigger streak_activity_log_touch_updated_at
before update on public.streak_activity_log
for each row execute function public.touch_updated_at();
