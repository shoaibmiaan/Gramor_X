-- 20251120_study_buddy_finalize.sql
-- Hardening Study Buddy lifecycle schema, RLS, and XP ledgers.

alter table if exists public.study_buddy_sessions
  alter column items type jsonb[] using (
    case
      when items is null then '{}'::jsonb[]
      when jsonb_typeof(items) = 'array' then array(select jsonb_array_elements(items))
      else array[items]
    end
  );

alter table if exists public.study_buddy_sessions
  alter column items set default '{}'::jsonb[];

alter table if exists public.study_buddy_sessions
  alter column items set not null;

alter table if exists public.study_buddy_sessions
  alter column xp_earned set default 0;

create index if not exists idx_sbs_user_state on public.study_buddy_sessions(user_id, state);
create index if not exists idx_sbs_created_desc on public.study_buddy_sessions(created_at desc);

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_buddy_sessions'
      and policyname = 'sbs_update_own'
  ) then
    drop policy sbs_update_own on public.study_buddy_sessions;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'study_buddy_sessions'
      and policyname = 'sbs_update_own_active'
  ) then
    create policy sbs_update_own_active
      on public.study_buddy_sessions
      for update
      using (auth.uid() = user_id and state in ('pending','started'))
      with check (auth.uid() = user_id and state in ('pending','started'));
  end if;
end $$;

alter table if exists public.user_xp_events
  add column if not exists metadata jsonb;

update public.user_xp_events set metadata = '{}'::jsonb where metadata is null;

alter table if exists public.user_xp_events
  alter column metadata set default '{}'::jsonb;

alter table if exists public.user_xp_events
  drop constraint if exists user_xp_events_source_check;

alter table if exists public.user_xp_events
  add constraint user_xp_events_source_check check (source in ('writing','study_buddy'));

create unique index if not exists uniq_user_xp_session
  on public.user_xp_events (user_id, (metadata->>'session_id'))
  where source = 'study_buddy' and metadata ? 'session_id';
