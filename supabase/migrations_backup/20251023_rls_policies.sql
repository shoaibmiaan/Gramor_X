-- 20251023_rls_policies.sql
-- Row-level security policies for the newly introduced exam_* tables and
-- enhanced writing tables.

alter table if exists public.exam_attempts enable row level security;
alter table if exists public.exam_events enable row level security;
alter table if exists public.writing_prompts enable row level security;
alter table if exists public.writing_responses enable row level security;

-- Exam attempts ---------------------------------------------------------------
do $$ begin
  create policy exam_attempts_owner_rw on public.exam_attempts
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy exam_attempts_staff_full on public.exam_attempts
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

-- Exam events ----------------------------------------------------------------
do $$ begin
  create policy exam_events_owner_rw on public.exam_events
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy exam_events_staff_full on public.exam_events
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

-- Writing prompts ------------------------------------------------------------
do $$ begin
  create policy writing_prompts_public_read on public.writing_prompts
    for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy writing_prompts_staff_manage on public.writing_prompts
    for all
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

-- Writing responses ----------------------------------------------------------
do $$ begin
  create policy writing_responses_owner_rw on public.writing_responses
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy writing_responses_staff_full on public.writing_responses
    for all
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;
