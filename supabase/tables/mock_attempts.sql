create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id text not null,
  section text not null check (section in ('listening', 'reading', 'writing', 'speaking')),
  mock_id text not null,
  payload jsonb not null default '{}'::jsonb,
  elapsed_sec integer not null default 0,
  duration_sec integer,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mock_attempts_user_attempt_section_idx
  on public.mock_attempts (user_id, attempt_id, section);

create index if not exists mock_attempts_user_updated_idx
  on public.mock_attempts (user_id, updated_at desc);

alter table public.mock_attempts enable row level security;

create policy if not exists "Users can read own mock attempts"
  on public.mock_attempts for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own mock attempts"
  on public.mock_attempts for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own mock attempts"
  on public.mock_attempts for update
  using (auth.uid() = user_id);

create trigger set_mock_attempts_timestamp
  before update on public.mock_attempts
  for each row
  execute procedure public.set_updated_at();
