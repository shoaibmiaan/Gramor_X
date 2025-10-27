-- 20251026_create_lifecycle_events.sql
-- Queue table for lifecycle notification worker.

create table if not exists public.lifecycle_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in ('first_mock_done','band_up','streak_broken')),
  status text not null default 'pending' check (status in ('pending','sent','skipped','failed')),
  channels text[] not null default '{}'::text[],
  context jsonb not null default '{}'::jsonb,
  dedupe_key text,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  last_attempt_at timestamptz
);

create index if not exists lifecycle_events_status_idx
  on public.lifecycle_events (status, created_at asc);

create index if not exists lifecycle_events_user_idx
  on public.lifecycle_events (user_id, event);

create unique index if not exists lifecycle_events_dedupe_idx
  on public.lifecycle_events (user_id, event, coalesce(dedupe_key, ''));

alter table public.lifecycle_events enable row level security;

create policy if not exists "lifecycle_events_owner_read"
  on public.lifecycle_events
  for select
  using (auth.uid() = user_id);

create policy if not exists "lifecycle_events_owner_write"
  on public.lifecycle_events
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "lifecycle_events_owner_update"
  on public.lifecycle_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
