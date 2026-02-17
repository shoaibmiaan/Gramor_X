-- Extend content RLS to allow public read of free items and safe inserts
do $$
begin
  if to_regclass('public.content') is not null then
    alter table public.content enable row level security;

    -- Public read of free content (no owner, not premium)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'content' and policyname = 'Public free content access'
    ) then
      create policy "Public free content access" on public.content
      for select
      using ((user_id is null) and (is_premium = false));
    end if;

    -- Insert rules: allow public free (no user_id) OR own content; premium requires tier
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'content' and policyname = 'Public free insert'
    ) then
      create policy "Public free insert" on public.content
      for insert
      with check (
        (user_id is null and is_premium = false)
        or (
          user_id = auth.uid()
          and (
            not is_premium
            or exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.tier in ('rocket','owl')
            )
          )
        )
      );
    end if;
  end if;
end$$;
