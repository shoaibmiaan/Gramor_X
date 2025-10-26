create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'admin'
$$;

create or replace function public.is_teacher()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'teacher'
$$;

alter table public.listening_responses enable row level security;

do $$
declare
  has_user_id     boolean;
  has_profile_id  boolean;
  has_attempt_id  boolean;
begin
  begin
    drop policy if exists "Students manage own listening_responses" on public.listening_responses;
  exception when undefined_object then null; end;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='listening_responses' and column_name='user_id'
  ) into has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='listening_responses' and column_name='profile_id'
  ) into has_profile_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='listening_responses' and column_name='attempt_id'
  ) into has_attempt_id;

  begin
    create policy "listening_responses_admin_all"
    on public.listening_responses
    for all to authenticated
    using (is_admin())
    with check (is_admin());
  exception when duplicate_object then null; end;

  if has_user_id then
    begin
      create policy "listening_responses_self_user_id"
      on public.listening_responses
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
    exception when duplicate_object then null; end;

  elsif has_profile_id then
    begin
      create policy "listening_responses_self_profile_id"
      on public.listening_responses
      for all to authenticated
      using (profile_id = auth.uid())
      with check (profile_id = auth.uid());
    exception when duplicate_object then null; end;

  elsif has_attempt_id then
    begin
      create policy "listening_responses_own_via_attempt"
      on public.listening_responses
      for all to authenticated
      using (exists (
        select 1 from public.exam_attempts ea
        where ea.id = listening_responses.attempt_id
          and ea.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.exam_attempts ea
        where ea.id = listening_responses.attempt_id
          and ea.user_id = auth.uid()
      ));
    exception when duplicate_object then null; end;

  else
    raise notice 'No user_id/profile_id/attempt_id on listening_responses; manual review needed.';
  end if;

  begin
    create policy "listening_responses_teacher_read"
    on public.listening_responses
    for select to authenticated
    using (is_teacher() or is_admin());
  exception when duplicate_object then null; end;
end$$;
