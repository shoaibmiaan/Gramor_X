-- 20251008000001_add_public_content_policy.sql
-- Safe public access extension (no duplicate errors)

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
end$$;
