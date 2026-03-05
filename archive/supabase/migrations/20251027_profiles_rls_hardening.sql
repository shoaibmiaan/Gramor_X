-- 0) Safe schema: PK, FK to auth.users, and helpful defaults
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free'::text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK to auth.users (id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end$$;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_profiles_timestamps on public.profiles;
create trigger trg_profiles_timestamps
before update on public.profiles
for each row execute procedure public.touch_updated_at();

-- 1) Enable RLS (idempotent)
alter table public.profiles enable row level security;

-- 2) Policies (idempotent create helpers)
create or replace function public.ensure_policy(_name text, _cmd text, _qual text)
returns void language plpgsql as $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname=_name) then
    execute format('create policy %I on public.profiles for %s to authenticated using (%s) with check (%s);',
      _name, _cmd, _qual, _qual);
  end if;
end$$;

-- Allow authenticated users to SELECT their own row
select public.ensure_policy(
  'profiles_select_own',
  'select',
  'auth.uid() = id'
);

-- Allow authenticated users to INSERT their own row only
select public.ensure_policy(
  'profiles_insert_own',
  'insert',
  'auth.uid() = id'
);

-- Allow authenticated users to UPDATE their own row only
select public.ensure_policy(
  'profiles_update_own',
  'update',
  'auth.uid() = id'
);

-- (Optional) Read-only public fields policy (comment out if you don’t want public reads)
-- create policy profiles_public_read on public.profiles
-- for select to anon, authenticated using (true);

-- 3) Auto-create a profile row on new auth user (root-level fix)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ensure trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 4) Backfill for existing auth users missing a profile
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
