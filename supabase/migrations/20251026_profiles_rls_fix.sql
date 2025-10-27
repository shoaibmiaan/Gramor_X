-- Duplicate-safe creation of the same policies (kept minimal on purpose)
alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles'
      and policyname = 'Allow users to insert their own profile'
  ) then
    create policy "Allow users to insert their own profile"
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles'
      and policyname = 'Allow users to update their own profile'
  ) then
    create policy "Allow users to update their own profile"
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end$$;
