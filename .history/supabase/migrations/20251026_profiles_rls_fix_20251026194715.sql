-- Allow authenticated users to insert their own profile if it matches auth.uid()
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow users to insert their own profile'
  ) then
    create policy "Allow users to insert their own profile"
    on public.profiles
    for insert
    with check (auth.uid() = id);
  end if;
end$$;

-- Allow authenticated users to update only their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow users to update their own profile'
  ) then
    create policy "Allow users to update their own profile"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;
end$$;
