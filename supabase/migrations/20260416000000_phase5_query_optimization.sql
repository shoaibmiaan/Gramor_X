-- Phase 5 / Task 9
-- Query optimization and dashboard-serving indexes.

BEGIN;

-- Dashboard aggregate tables
CREATE INDEX IF NOT EXISTS score_history_user_occurred_cover_idx
  ON public.score_history (user_id, occurred_at DESC)
  INCLUDE (score, band);

CREATE INDEX IF NOT EXISTS streak_logs_user_activity_cover_idx
  ON public.streak_logs (user_id, activity_date DESC)
  INCLUDE (streak_days);

CREATE INDEX IF NOT EXISTS ai_recommendations_dashboard_cover_idx
  ON public.ai_recommendations (user_id, active, priority DESC, created_at DESC)
  INCLUDE (type, content, model_version, expires_at, consumed_at)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS subscriptions_user_created_cover_idx
  ON public.subscriptions (user_id, created_at DESC)
  INCLUDE (plan_id, status, renews_at, metadata);

-- Study plan generation/regeneration paths
CREATE INDEX IF NOT EXISTS user_study_plans_user_active_generated_idx
  ON public.user_study_plans (user_id, active, generated_at DESC);

-- Onboarding context reads
CREATE INDEX IF NOT EXISTS onboarding_sessions_user_updated_cover_idx
  ON public.onboarding_sessions (user_id, updated_at DESC)
  INCLUDE (status, current_step, payload);

CREATE INDEX IF NOT EXISTS user_preferences_user_cover_idx
  ON public.user_preferences (user_id)
  INCLUDE (goal_band, exam_date, learning_style);

COMMIT;
