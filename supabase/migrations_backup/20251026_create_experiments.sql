-- 20251026_create_experiments.sql
-- Core experiment tables for assignment, variants, and lifecycle tracking.

create table if not exists public.experiments (
  key text primary key,
  name text not null,
  status text not null default 'draft' check (status in ('draft','running','paused','completed','disabled')),
  default_variant text not null default 'control',
  traffic_percentage integer not null default 100 check (traffic_percentage >= 0 and traffic_percentage <= 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.experiment_variants (
  id bigserial primary key,
  experiment_key text not null references public.experiments(key) on delete cascade,
  variant text not null,
  weight integer not null default 0 check (weight >= 0),
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint experiment_variants_unique unique (experiment_key, variant)
);

create index if not exists experiment_variants_experiment_idx
  on public.experiment_variants (experiment_key);

create table if not exists public.experiment_assignments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_key text not null references public.experiments(key) on delete cascade,
  variant text not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  guardrail_state text not null default 'active' check (guardrail_state in ('active','disabled')),
  exposures integer not null default 0,
  conversions integer not null default 0,
  last_exposed_at timestamptz,
  last_converted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint experiment_assignments_unique unique (user_id, experiment_key)
);

create index if not exists experiment_assignments_experiment_idx
  on public.experiment_assignments (experiment_key, assigned_at desc);

create table if not exists public.experiment_events (
  id bigserial primary key,
  experiment_key text not null references public.experiments(key) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  variant text not null,
  event text not null check (event in ('assign','expose','convert')),
  context jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists experiment_events_experiment_idx
  on public.experiment_events (experiment_key, recorded_at desc);

create index if not exists experiment_events_user_idx
  on public.experiment_events (user_id, experiment_key, recorded_at desc);

alter table public.experiments enable row level security;
alter table public.experiment_variants enable row level security;
alter table public.experiment_assignments enable row level security;
alter table public.experiment_events enable row level security;

create policy if not exists "experiments_read"
  on public.experiments
  for select
  using (true);

create policy if not exists "experiment_variants_read"
  on public.experiment_variants
  for select
  using (true);

create policy if not exists "experiment_assignments_self"
  on public.experiment_assignments
  for select
  using (auth.uid() = user_id);

create policy if not exists "experiment_assignments_self_insert"
  on public.experiment_assignments
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "experiment_assignments_self_update"
  on public.experiment_assignments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "experiment_events_self_read"
  on public.experiment_events
  for select
  using (auth.uid() = user_id);

create policy if not exists "experiment_events_self_insert"
  on public.experiment_events
  for insert
  with check (auth.uid() = user_id);
