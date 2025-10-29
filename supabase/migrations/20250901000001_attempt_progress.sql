-- supabase/migrations/20250901_attempt_progress.sql
-- attempt autosave progress with RLS

create table if not exists public.attempt_progress (
  attempt_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('listening', 'reading', 'writing', 'speaking')),
  payload jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  elapsed_sec integer not null default 0,
  duration_sec integer,
  completed boolean not null default false,
  draft_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attempt_progress_user_updated_idx
  on public.attempt_progress (user_id, updated_at desc);

create index if not exists attempt_progress_user_module_idx
  on public.attempt_progress (user_id, module);

alter table public.attempt_progress enable row level security;

create policy if not exists "Users can read own attempt progress"
  on public.attempt_progress for select
  using (auth.uid() = user_id);

create policy if not exists "Users can upsert own attempt progress"
  on public.attempt_progress for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own attempt progress"
  on public.attempt_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_attempt_progress_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_attempt_progress_updated on public.attempt_progress;
create trigger trg_attempt_progress_updated
before update on public.attempt_progress
for each row execute procedure public.set_attempt_progress_updated_at();
