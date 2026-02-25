-- 1. Main stats table (per user)
create table if not exists public.user_competitive_stats (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  -- XP
  total_xp integer not null default 0,
  weekly_xp integer not null default 0,

  -- Bands (overall + per skill)
  overall_band numeric(3,1),
  reading_band numeric(3,1),
  listening_band numeric(3,1),
  writing_band numeric(3,1),
  speaking_band numeric(3,1),

  -- Attempts + streak
  attempts_total integer not null default 0,
  streak_days integer not null default 0,

  -- Optional: cached country (so leaderboard doesn’t need heavy joins)
  country_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_competitive_stats is
  'Per-user cached stats for score card + leaderboards (XP, bands, attempts, streak).';

-- 2. Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_user_competitive_stats on public.user_competitive_stats;

create trigger set_updated_at_user_competitive_stats
before update on public.user_competitive_stats
for each row
execute procedure public.set_updated_at();

-- 3. Helpful indexes for leaderboard queries
create index if not exists idx_user_competitive_stats_total_xp
  on public.user_competitive_stats (total_xp desc);

create index if not exists idx_user_competitive_stats_weekly_xp
  on public.user_competitive_stats (weekly_xp desc);

create index if not exists idx_user_competitive_stats_overall_band
  on public.user_competitive_stats (overall_band desc);

-- 4. RLS: leaderboard is public to signed-in users, but only owner can write
alter table public.user_competitive_stats enable row level security;

-- anyone logged-in can read leaderboard stats
create policy "Anyone can read leaderboard stats"
on public.user_competitive_stats
for select
to authenticated
using (true);

-- user can insert their own row
create policy "User can insert own stats row"
on public.user_competitive_stats
for insert
to authenticated
with check (user_id = auth.uid());

-- user can update only their own stats
create policy "User can update own stats row"
on public.user_competitive_stats
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());



-- 5. Views for score card + global leaderboard
-- (Adjust `profiles.display_name` / `profiles.country_code` to match your actual columns.)

create or replace view public.v_user_scorecard as
select
  u.user_id,
  u.total_xp,
  u.weekly_xp,
  u.overall_band,
  u.reading_band,
  u.listening_band,
  u.writing_band,
  u.speaking_band,
  u.attempts_total,
  u.streak_days,
  u.country_code,
  u.created_at,
  u.updated_at
from public.user_competitive_stats u;



create or replace view public.v_leaderboard_global as
select
  dense_rank() over (order by u.total_xp desc, u.overall_band desc, u.attempts_total asc, u.user_id) as rank,
  u.user_id,
  coalesce(p.display_name, 'Learner') as display_name,
  coalesce(u.country_code, p.country_code, '🌍') as country_code,
  u.total_xp,
  u.overall_band,
  u.attempts_total,
  u.streak_days,
  u.weekly_xp,
  u.updated_at
from public.user_competitive_stats u
left join public.profiles p on p.id = u.user_id;



create or replace view public.v_leaderboard_weekly as
select
  dense_rank() over (order by u.weekly_xp desc, u.total_xp desc, u.user_id) as rank,
  u.user_id,
  coalesce(p.display_name, 'Learner') as display_name,
  coalesce(u.country_code, p.country_code, '🌍') as country_code,
  u.weekly_xp,
  u.total_xp,
  u.overall_band,
  u.attempts_total,
  u.streak_days,
  u.updated_at
from public.user_competitive_stats u
left join public.profiles p on p.id = u.user_id
where u.weekly_xp > 0;
