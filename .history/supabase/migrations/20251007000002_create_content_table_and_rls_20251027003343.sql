-- 20251007000002_create_content_table_and_rls.sql
-- Content table (uses pgcrypto gen_random_uuid instead of uuid_generate_v4)

create extension if not exists pgcrypto with schema public;

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'article',
  content jsonb,
  is_premium boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.content enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content'
      and policyname='Own content access'
  ) then
    create policy "Own content access"
      on public.content
      for all
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content'
      and policyname='Owl full access'
  ) then
    create policy "Owl full access"
      on public.content
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and tier = 'owl'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content'
      and policyname='Rocket premium insert'
  ) then
    create policy "Rocket premium insert"
      on public.content
      for insert
      with check (
        not (is_premium = true and not exists (
          select 1 from public.profiles
          where id = auth.uid() and tier in ('rocket','owl')
        ))
      );
  end if;
end$$;
