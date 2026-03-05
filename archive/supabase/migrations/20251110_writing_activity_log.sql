-- 20251110_writing_activity_log.sql
-- Logs completions of tips/micro-practice per user. RLS enforced.

create extension if not exists pgcrypto;

create table if not exists public.writing_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tip','micro')),
  ref_id text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_wal_user on public.writing_activity_log (user_id);
create index if not exists idx_wal_user_kind_ref on public.writing_activity_log (user_id, kind, ref_id);
create index if not exists idx_wal_created_at on public.writing_activity_log (created_at desc);

-- RLS
alter table public.writing_activity_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'writing_activity_log' and policyname = 'wal_select_own'
  ) then
    create policy wal_select_own
      on public.writing_activity_log
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'writing_activity_log' and policyname = 'wal_insert_own'
  ) then
    create policy wal_insert_own
      on public.writing_activity_log
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'writing_activity_log' and policyname = 'wal_delete_own'
  ) then
    create policy wal_delete_own
      on public.writing_activity_log
      for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- privileges (RLS will still gate)
grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.writing_activity_log to anon, authenticated;
grant all on public.writing_activity_log to service_role, postgres;

comment on table public.writing_activity_log is 'Per-user completions for writing tips/micro practice.';
