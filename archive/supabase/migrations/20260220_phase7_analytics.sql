-- supabase/migrations/20260220_phase7_analytics.sql
-- Phase 7 analytics tables for review funnels, experiments, and collocation tracking.

create table if not exists public.experiments (
  key text primary key,
  name text not null,
  status text not null default 'planned' check (status in ('planned','running','paused','completed')),
  guardrail_reason text,
  updated_at timestamptz not null default now()
);

insert into public.experiments(key, name, status)
values
  ('spaced-intervals', 'Spaced intervals A/B', 'running'),
  ('collocation-sequence', 'Collocation-first vs word-first', 'planned'),
  ('challenge-notifications', 'Challenge notifications on/off', 'planned')
on conflict (key) do nothing;

create table if not exists public.experiment_assignments (
  user_id uuid references auth.users(id) on delete cascade,
  experiment_key text references public.experiments(key) on delete cascade,
  variant text not null,
  assigned_at timestamptz not null default now(),
  guardrail_state text not null default 'active',
  constraint experiment_assignments_pkey primary key (user_id, experiment_key)
);

create index if not exists idx_experiment_assignments_experiment
  on public.experiment_assignments (experiment_key, assigned_at desc);

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event text not null check (event in ('open', 'complete')),
  source text,
  word_id uuid references public.words(id),
  occurred_at timestamptz not null default now()
);

create index if not exists idx_review_events_user_day
  on public.review_events (user_id, occurred_at desc);

create index if not exists idx_review_events_event_day
  on public.review_events (event, occurred_at desc);

create table if not exists public.collocation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  challenge_id uuid references public.challenges(id),
  attempts integer not null default 1 check (attempts > 0),
  correct integer not null default 0 check (correct >= 0 and correct <= attempts),
  source text,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_collocation_attempts_user_day
  on public.collocation_attempts (user_id, attempted_at desc);

create index if not exists idx_collocation_attempts_challenge
  on public.collocation_attempts (challenge_id, attempted_at desc);
