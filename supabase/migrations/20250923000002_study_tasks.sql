-- 20250923000002_study_tasks.sql
-- Study tasks with idempotent RLS

create table if not exists public.study_tasks (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  scheduled_date date not null,
  catch_up boolean default false,
  created_at timestamptz default now()
);

alter table if exists public.study_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='study_tasks'
      and policyname='users select own study tasks'
  ) then
    create policy "users select own study tasks"
      on public.study_tasks
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='study_tasks'
      and policyname='users insert own study tasks'
  ) then
    create policy "users insert own study tasks"
      on public.study_tasks
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='study_tasks'
      and policyname='users update own study tasks'
  ) then
    create policy "users update own study tasks"
      on public.study_tasks
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='study_tasks'
      and policyname='users delete own study tasks'
  ) then
    create policy "users delete own study tasks"
      on public.study_tasks
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end$$;
