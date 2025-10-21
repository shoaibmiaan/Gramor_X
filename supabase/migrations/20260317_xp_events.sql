-- 20260317_xp_events.sql
-- XP events table for vocabulary gamification

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source = 'vocab'),
  amount int not null check (amount between 0 and 200),
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy if not exists "Users read own xp events" on public.xp_events
  for select using (auth.uid() = user_id);

create policy if not exists "Users insert own xp events" on public.xp_events
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users update own xp events" on public.xp_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users delete own xp events" on public.xp_events
  for delete using (auth.uid() = user_id);

create index if not exists idx_xp_events_user_created
  on public.xp_events (user_id, created_at);
