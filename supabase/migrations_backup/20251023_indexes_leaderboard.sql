-- 20251023_indexes_leaderboard.sql
-- Additional indexes to keep analytics and leaderboard queries responsive.

create index if not exists exam_attempts_user_created_idx
  on public.exam_attempts(user_id, created_at desc);

create index if not exists writing_responses_user_submitted_idx
  on public.writing_responses(user_id, submitted_at desc);

create index if not exists user_xp_events_user_source_idx
  on public.user_xp_events(user_id, source, created_at desc);

create index if not exists mistakes_status_idx
  on public.mistakes(status, created_at desc);

create index if not exists study_plan_focus_area_idx
  on public.study_plan_focus(area, weight desc);
