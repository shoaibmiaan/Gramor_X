-- 20251008000002_add_public_free_content_policy.sql
-- Public free access and insert (idempotent)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content'
      and policyname='Public free content access'
  ) then
    create policy "Public free content access"
      on public.content
      for select
      using ((user_id is null and is_premium = false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content'
      and policyname='Public free insert'
  ) then
    create policy "Public free insert"
      on public.content
      for insert
      with check (
        (user_id is null and is_premium = false)
        or user_id = auth.uid()
      );
  end if;
end$$;
