-- 20251007000001_add_tier_rls_policies.sql
-- Tiered content RLS with guards

alter table if exists public.content enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content'
      and policyname='Tiered content access'
  ) then
    create policy "Tiered content access" on public.content
      for all
      using (
        auth.uid() = user_id
        or (select tier from public.profiles where id = auth.uid()) = 'owl'
      )
      with check (
        auth.uid() = user_id
        or (select tier from public.profiles where id = auth.uid()) in ('rocket','owl')
      );
  end if;
end$$;
