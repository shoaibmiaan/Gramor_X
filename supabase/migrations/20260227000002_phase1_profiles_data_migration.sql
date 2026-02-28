-- Phase 1 / Task 3
-- Data migration: profiles -> domain tables
-- Includes backup and controlled legacy-column removal.

BEGIN;


-- Ensure legacy columns referenced below exist (for compatibility across environments)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS membership text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS buddy_seats integer,
  ADD COLUMN IF NOT EXISTS buddy_seats_used integer,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time,
  ADD COLUMN IF NOT EXISTS quiet_hours_end time,
  ADD COLUMN IF NOT EXISTS teacher_onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_subjects text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS teacher_bio text,
  ADD COLUMN IF NOT EXISTS teacher_experience_years integer,
  ADD COLUMN IF NOT EXISTS teacher_cv_url text;

-- ---------------------------------------------------------------------------
-- 0) Safety backup for rollback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_phase1_backup AS
SELECT p.*
FROM public.profiles p
WHERE false;

INSERT INTO public.profile_phase1_backup
SELECT p.*
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profile_phase1_backup b
  WHERE b.id = p.id
);

-- ---------------------------------------------------------------------------
-- 1) Subscription domain copy
-- ---------------------------------------------------------------------------
UPDATE public.subscriptions s
SET
  plan_id = COALESCE(
    s.plan_id,
    NULLIF(lower(p.plan), ''),
    NULLIF(lower(p.membership), ''),
    NULLIF(lower(p.tier), ''),
    'free'
  ),
  status = COALESCE(s.status, CASE WHEN p.status IN ('active','trialing','canceled','past_due') THEN p.status ELSE 'active' END),
  seats = GREATEST(
    COALESCE(s.seats, 1),
    COALESCE(p.buddy_seats, 0) + 1
  ),
  started_at = COALESCE(s.started_at, s.created_at, now()),
  renews_at = COALESCE(s.renews_at, s.current_period_end),
  updated_at = now()
FROM public.profiles p
WHERE s.user_id = p.id;

INSERT INTO public.subscriptions (user_id, stripe_subscription_id, plan_id, status, seats, started_at, renews_at, created_at, updated_at)
SELECT
  p.id,
  'legacy-profile-migration-' || p.id::text,
  COALESCE(NULLIF(lower(p.plan), ''), NULLIF(lower(p.membership), ''), NULLIF(lower(p.tier), ''), 'free'),
  CASE WHEN p.status IN ('active','trialing','canceled','past_due','incomplete','unpaid') THEN p.status ELSE 'active' END,
  GREATEST(COALESCE(p.buddy_seats, 0) + 1, 1),
  COALESCE(p.created_at, now()),
  NULL,
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
);

-- ---------------------------------------------------------------------------
-- 2) Onboarding and preferences copy
-- ---------------------------------------------------------------------------
INSERT INTO public.onboarding_sessions (
  user_id, status, current_step, completed_steps, payload, started_at, completed_at, created_at, updated_at
)
SELECT
  p.id,
  CASE WHEN COALESCE(p.onboarding_complete, false) OR COALESCE(p.setup_complete, false) THEN 'completed' ELSE 'in_progress' END,
  COALESCE(p.onboarding_step, 0),
  CASE WHEN COALESCE(p.onboarding_complete, false) THEN ARRAY['setup']::text[] ELSE '{}'::text[] END,
  jsonb_strip_nulls(jsonb_build_object(
    'english_level', p.english_level,
    'goal_band', p.goal_band,
    'exam_date', p.exam_date,
    'study_prefs', COALESCE(p.study_prefs, '{}'::text[]),
    'goal_reason', COALESCE(p.goal_reason, '{}'::text[])
  )),
  COALESCE(p.created_at, now()),
  CASE WHEN COALESCE(p.onboarding_complete, false) OR COALESCE(p.setup_complete, false) THEN now() ELSE NULL END,
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_sessions o WHERE o.user_id = p.id
);

INSERT INTO public.user_preferences (
  user_id,
  preferred_language,
  language_preference,
  country,
  timezone,
  study_prefs,
  focus_topics,
  goal_reason,
  learning_style,
  time_commitment,
  time_commitment_min,
  days_per_week,
  study_days,
  study_minutes_per_day,
  daily_quota_goal,
  exam_date,
  goal_band,
  weaknesses,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.preferred_language,
  COALESCE(p.language_preference, p.preferred_language),
  p.country,
  p.timezone,
  COALESCE(p.study_prefs, '{}'::text[]),
  COALESCE(p.focus_topics, '{}'::text[]),
  COALESCE(p.goal_reason, '{}'::text[]),
  p.learning_style,
  p.time_commitment,
  p.time_commitment_min,
  p.days_per_week,
  COALESCE(p.study_days, '{}'::text[]),
  p.study_minutes_per_day,
  p.daily_quota_goal,
  p.exam_date,
  p.goal_band,
  COALESCE(p.weaknesses, '{}'::text[]),
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE
SET
  preferred_language = EXCLUDED.preferred_language,
  language_preference = EXCLUDED.language_preference,
  country = EXCLUDED.country,
  timezone = EXCLUDED.timezone,
  study_prefs = EXCLUDED.study_prefs,
  focus_topics = EXCLUDED.focus_topics,
  goal_reason = EXCLUDED.goal_reason,
  learning_style = EXCLUDED.learning_style,
  time_commitment = EXCLUDED.time_commitment,
  time_commitment_min = EXCLUDED.time_commitment_min,
  days_per_week = EXCLUDED.days_per_week,
  study_days = EXCLUDED.study_days,
  study_minutes_per_day = EXCLUDED.study_minutes_per_day,
  daily_quota_goal = EXCLUDED.daily_quota_goal,
  exam_date = EXCLUDED.exam_date,
  goal_band = EXCLUDED.goal_band,
  weaknesses = EXCLUDED.weaknesses,
  updated_at = now();

INSERT INTO public.notification_settings (
  user_id,
  notification_channels,
  whatsapp_opt_in,
  marketing_opt_in,
  quiet_hours_start,
  quiet_hours_end,
  phone,
  phone_verified,
  created_at,
  updated_at
)
SELECT
  p.id,
  COALESCE(p.notification_channels, '{}'::text[]),
  COALESCE(p.whatsapp_opt_in, false),
  COALESCE(p.marketing_opt_in, false),
  p.quiet_hours_start,
  p.quiet_hours_end,
  p.phone,
  p.phone_verified,
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE
SET
  notification_channels = EXCLUDED.notification_channels,
  whatsapp_opt_in = EXCLUDED.whatsapp_opt_in,
  marketing_opt_in = EXCLUDED.marketing_opt_in,
  quiet_hours_start = EXCLUDED.quiet_hours_start,
  quiet_hours_end = EXCLUDED.quiet_hours_end,
  phone = EXCLUDED.phone,
  phone_verified = EXCLUDED.phone_verified,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) AI domain copy
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_recommendations (
  user_id,
  type,
  priority,
  content,
  model_version,
  active,
  created_at
)
SELECT
  p.id,
  'legacy_profile',
  1,
  COALESCE(p.ai_recommendation, '{}'::jsonb),
  COALESCE(p.ai_recommendation->>'source', 'legacy-v1'),
  true,
  COALESCE(p.created_at, now())
FROM public.profiles p
WHERE p.ai_recommendation IS NOT NULL
  AND p.ai_recommendation <> '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_recommendations r
    WHERE r.user_id = p.id AND r.type = 'legacy_profile'
  );

-- ---------------------------------------------------------------------------
-- 4) Teacher domain copy
-- ---------------------------------------------------------------------------
INSERT INTO public.teacher_profiles (
  user_id,
  onboarding_completed,
  approved,
  subjects,
  bio,
  experience_years,
  cv_url,
  created_at,
  updated_at
)
SELECT
  p.id,
  COALESCE(p.teacher_onboarding_completed, false),
  COALESCE(p.teacher_approved, false),
  COALESCE(p.teacher_subjects, '{}'::text[]),
  p.teacher_bio,
  p.teacher_experience_years,
  p.teacher_cv_url,
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
WHERE
  COALESCE(p.teacher_onboarding_completed, false)
  OR COALESCE(p.teacher_approved, false)
  OR p.teacher_bio IS NOT NULL
  OR p.teacher_cv_url IS NOT NULL
  OR COALESCE(array_length(p.teacher_subjects, 1), 0) > 0
ON CONFLICT (user_id) DO UPDATE
SET
  onboarding_completed = EXCLUDED.onboarding_completed,
  approved = EXCLUDED.approved,
  subjects = EXCLUDED.subjects,
  bio = EXCLUDED.bio,
  experience_years = EXCLUDED.experience_years,
  cv_url = EXCLUDED.cv_url,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5) Identity normalization in profiles
-- ---------------------------------------------------------------------------
UPDATE public.profiles p
SET
  first_name = COALESCE(p.first_name, NULLIF(split_part(COALESCE(p.full_name, ''), ' ', 1), ''), 'Learner'),
  last_name = COALESCE(p.last_name, NULLIF(regexp_replace(COALESCE(p.full_name, ''), '^\S+\s*', ''), '')),
  email = COALESCE(p.email, u.email),
  locale = COALESCE(p.locale, p.preferred_language, p.language_preference, 'en'),
  updated_at = now()
FROM auth.users u
WHERE u.id = p.id;

-- ---------------------------------------------------------------------------
-- 6) Reduce profiles to identity-only fields after backfill
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS english_level,
  DROP COLUMN IF EXISTS goal_band,
  DROP COLUMN IF EXISTS exam_date,
  DROP COLUMN IF EXISTS study_prefs,
  DROP COLUMN IF EXISTS time_commitment,
  DROP COLUMN IF EXISTS time_commitment_min,
  DROP COLUMN IF EXISTS days_per_week,
  DROP COLUMN IF EXISTS preferred_language,
  DROP COLUMN IF EXISTS language_preference,
  DROP COLUMN IF EXISTS goal_reason,
  DROP COLUMN IF EXISTS learning_style,
  DROP COLUMN IF EXISTS ai_recommendation,
  DROP COLUMN IF EXISTS setup_complete,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS weaknesses,
  DROP COLUMN IF EXISTS focus_topics,
  DROP COLUMN IF EXISTS daily_quota_goal,
  DROP COLUMN IF EXISTS study_days,
  DROP COLUMN IF EXISTS study_minutes_per_day,
  DROP COLUMN IF EXISTS onboarding_step,
  DROP COLUMN IF EXISTS onboarding_complete,
  DROP COLUMN IF EXISTS whatsapp_opt_in,
  DROP COLUMN IF EXISTS notification_channels,
  DROP COLUMN IF EXISTS marketing_opt_in,
  DROP COLUMN IF EXISTS quiet_hours_start,
  DROP COLUMN IF EXISTS quiet_hours_end,
  DROP COLUMN IF EXISTS membership,
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS teacher_onboarding_completed,
  DROP COLUMN IF EXISTS teacher_approved,
  DROP COLUMN IF EXISTS teacher_subjects,
  DROP COLUMN IF EXISTS teacher_bio,
  DROP COLUMN IF EXISTS teacher_experience_years,
  DROP COLUMN IF EXISTS teacher_cv_url,
  DROP COLUMN IF EXISTS buddy_seats,
  DROP COLUMN IF EXISTS buddy_seats_used,
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS settings,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS pending_deletion,
  DROP COLUMN IF EXISTS deletion_requested_at,
  DROP COLUMN IF EXISTS deletion_confirmed_at;

COMMIT;

-- Rollback strategy:
-- 1) Run `20260227000003_phase1_profiles_rollback.sql`.
-- 2) It restores legacy profile columns and values from `profile_phase1_backup`.
-- 3) After verification, drop phase1 domain rows created by this migration if desired.
