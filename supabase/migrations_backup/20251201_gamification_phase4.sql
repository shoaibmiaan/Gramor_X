-- 20251201_gamification_phase4.sql
-- Phase 4 Gamification tables: challenges, user progress, XP events, leaderboard snapshots

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  challenge_type text not null check (challenge_type in ('daily','weekly')),
  topic text,
  goal int not null default 1,
  xp_event text not null check (xp_event in ('correct','hard','speaking_attempt','writing_mini')),
  xp_reward int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.challenges enable row level security;

create policy if not exists "Challenges are public" on public.challenges
  for select using (true);

create policy if not exists "Service manages challenges" on public.challenges
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress_count int not null default 0,
  total_mastered int not null default 0,
  target int not null default 0,
  last_incremented_at timestamptz,
  resets_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_user_challenge unique (user_id, challenge_id)
);

alter table public.user_challenge_progress enable row level security;

create policy if not exists "Users manage own challenge progress" on public.user_challenge_progress
  for select using (auth.uid() = user_id);

create policy if not exists "Users upsert own challenge progress" on public.user_challenge_progress
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users update own challenge progress" on public.user_challenge_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_user_challenge_progress_user
  on public.user_challenge_progress (user_id, challenge_id);

create table if not exists public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('correct','hard','speaking_attempt','writing_mini')),
  xp int not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.user_xp_events enable row level security;

create policy if not exists "Users read own xp events" on public.user_xp_events
  for select using (auth.uid() = user_id);

create policy if not exists "Users insert xp events" on public.user_xp_events
  for insert with check (auth.uid() = user_id);

create policy if not exists "Service manages xp events" on public.user_xp_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_user_xp_events_user_created
  on public.user_xp_events (user_id, created_at desc);

create table if not exists public.xp_leaderboard_entries (
  id bigserial primary key,
  scope text not null check (scope in ('daily','weekly')),
  snapshot_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  xp int not null,
  rank int not null,
  created_at timestamptz default now()
);

alter table public.xp_leaderboard_entries enable row level security;

create policy if not exists "Leaderboards are public" on public.xp_leaderboard_entries
  for select using (true);

create policy if not exists "Service manages xp leaderboard" on public.xp_leaderboard_entries
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_xp_leaderboard_scope_snapshot
  on public.xp_leaderboard_entries (scope, snapshot_date desc, rank asc);

-- Ensure updated_at is refreshed
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_challenges_updated on public.challenges;
create trigger trg_challenges_updated
before update on public.challenges
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_challenge_progress_updated on public.user_challenge_progress;
create trigger trg_user_challenge_progress_updated
before update on public.user_challenge_progress
for each row execute procedure public.set_updated_at();

-- Seed the collocation challenges (daily + weekly)
insert into public.challenges (slug, title, description, challenge_type, topic, goal, xp_event, xp_reward)
values
  (
    'daily-collocation-sprint',
    'Daily Collocation Sprint',
    'Master 5 collocations in the Environment topic today.',
    'daily',
    'Environment',
    5,
    'hard',
    12
  ),
  (
    'weekly-collocation-marathon',
    'Weekly Collocation Marathon',
    'Master 25 collocations across the Environment topic this week.',
    'weekly',
    'Environment',
    25,
    'hard',
    12
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  challenge_type = excluded.challenge_type,
  topic = excluded.topic,
  goal = excluded.goal,
  xp_event = excluded.xp_event,
  xp_reward = excluded.xp_reward,
  updated_at = now();
