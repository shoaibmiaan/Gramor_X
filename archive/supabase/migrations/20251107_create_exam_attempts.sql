-- ========= Helpers =========
-- Avoid NOT NULL / CHECK while patching existing tables.
-- Keep it minimal so your current API starts working immediately.

-- ========= exam_attempts: ensure table exists (no-op if it does) =========
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade
);

-- Add columns if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='exam_type'
  ) then
    alter table public.exam_attempts add column exam_type text; -- keep nullable for patch
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='status'
  ) then
    alter table public.exam_attempts add column status text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='duration_seconds'
  ) then
    alter table public.exam_attempts add column duration_seconds integer;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='goal_band'
  ) then
    alter table public.exam_attempts add column goal_band numeric(3,1);
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='metadata'
  ) then
    alter table public.exam_attempts add column metadata jsonb default '{}'::jsonb;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='started_at'
  ) then
    alter table public.exam_attempts add column started_at timestamptz default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='submitted_at'
  ) then
    alter table public.exam_attempts add column submitted_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exam_attempts' and column_name='created_at'
  ) then
    alter table public.exam_attempts add column created_at timestamptz default now();
  end if;
end $$;

-- Enable RLS and minimal policies (self access) for exam_attempts
alter table public.exam_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_attempts' and policyname='exam_attempts_select_own'
  ) then
    create policy exam_attempts_select_own
      on public.exam_attempts for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_attempts' and policyname='exam_attempts_insert_self'
  ) then
    create policy exam_attempts_insert_self
      on public.exam_attempts for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_attempts' and policyname='exam_attempts_update_own'
  ) then
    create policy exam_attempts_update_own
      on public.exam_attempts for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_exam_attempts_user_created
  on public.exam_attempts (user_id, created_at desc);

-- ========= exam_events: create if missing =========
create table if not exists public.exam_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.exam_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_events' and policyname='exam_events_select_own'
  ) then
    create policy exam_events_select_own
      on public.exam_events for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_events' and policyname='exam_events_insert_self'
  ) then
    create policy exam_events_insert_self
      on public.exam_events for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_exam_events_attempt_created
  on public.exam_events (attempt_id, created_at);

-- ========= (Optional) writing_prompts read policy, if table exists =========
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='writing_prompts'
  ) then
    alter table public.writing_prompts enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='writing_prompts' and policyname='writing_prompts_read_all'
    ) then
      create policy writing_prompts_read_all
        on public.writing_prompts for select
        using (auth.role() = 'authenticated');
    end if;
  end if;
end $$;
