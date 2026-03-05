-- 20251112_alter_study_buddy_sessions.sql
-- Align study_buddy_sessions table with extended session lifecycle fields

alter table if exists public.study_buddy_sessions
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_minutes integer,
  add column if not exists ai_plan_id uuid,
  add column if not exists xp_earned integer default 0;

create index if not exists idx_sbs_started_at on public.study_buddy_sessions(started_at);
create index if not exists idx_sbs_ended_at on public.study_buddy_sessions(ended_at);
