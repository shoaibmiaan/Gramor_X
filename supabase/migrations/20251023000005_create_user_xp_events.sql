-- 20251023_create_user_xp_events.sql
-- Tracks XP earned from writing attempts so gamification can surface streaks
-- and leaderboards filtered by skill.

create table if not exists public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'writing' check (source = 'writing'),
  attempt_id uuid references public.exam_attempts(id) on delete set null,
  points integer not null check (points >= 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_xp_events_user_idx on public.user_xp_events(user_id, created_at desc);
create index if not exists user_xp_events_attempt_idx on public.user_xp_events(attempt_id);

alter table if exists public.user_xp_events enable row level security;

do $$ begin
  create policy user_xp_events_owner_rw on public.user_xp_events
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy user_xp_events_staff_full on public.user_xp_events
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

comment on table public.user_xp_events is 'XP events awarded for skill-based practice such as writing mock exams.';
