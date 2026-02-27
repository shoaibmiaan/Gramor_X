-- Phase 1 / Task 2
-- Enterprise Schema v2 (non-breaking oriented, idempotent where practical)
-- Goal: make profiles identity-only and move domain data into dedicated tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 0) Profiles identity-only alignment
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill identity fields from full_name when available.
UPDATE public.profiles
SET
  first_name = COALESCE(
    first_name,
    NULLIF(split_part(COALESCE(full_name, ''), ' ', 1), ''),
    'Learner'
  ),
  last_name = COALESCE(
    last_name,
    NULLIF(regexp_replace(COALESCE(full_name, ''), '^\S+\s*', ''), '')
  )
WHERE first_name IS NULL OR last_name IS NULL;

-- Ensure email can be derived from auth.users when missing.
UPDATE public.profiles p
SET email = COALESCE(p.email, u.email)
FROM auth.users u
WHERE u.id = p.id
  AND p.email IS NULL;

-- ---------------------------------------------------------------------------
-- 1) Plans and subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  rank smallint NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month','year','lifetime')),
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (id, name, rank, price_cents, currency, billing_interval, feature_flags, limits)
VALUES
  ('free', 'Free', 0, 0, 'USD', 'month', '{"ai": false, "teacher": false}'::jsonb, '{"daily_quota": 20}'::jsonb),
  ('starter', 'Starter', 1, 900, 'USD', 'month', '{"ai": true, "teacher": false}'::jsonb, '{"daily_quota": 80}'::jsonb),
  ('booster', 'Booster', 2, 1900, 'USD', 'month', '{"ai": true, "teacher": false}'::jsonb, '{"daily_quota": 200}'::jsonb),
  ('master', 'Master', 3, 3900, 'USD', 'month', '{"ai": true, "teacher": true}'::jsonb, '{"daily_quota": 1000}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_id_fkey'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_plan_id_fkey
      FOREIGN KEY (plan_id)
      REFERENCES public.plans(id)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 2) Analytics domain tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_band numeric(3,1),
  current_score integer,
  confidence numeric(4,3),
  last_assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'system',
  score integer,
  band numeric(3,1),
  delta numeric(3,1),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.streak_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  streak_days integer NOT NULL DEFAULT 0,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date)
);

-- ---------------------------------------------------------------------------
-- 3) AI domain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'study_plan',
  priority smallint NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ai_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnostic_type text NOT NULL DEFAULT 'mistake_profile',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) Onboarding domain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  current_step smallint NOT NULL DEFAULT 0,
  completed_steps text[] NOT NULL DEFAULT '{}'::text[],
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5) Preferences domain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_language text,
  language_preference text,
  country text,
  timezone text,
  study_prefs text[] NOT NULL DEFAULT '{}'::text[],
  focus_topics text[] NOT NULL DEFAULT '{}'::text[],
  goal_reason text[] NOT NULL DEFAULT '{}'::text[],
  learning_style text,
  time_commitment text,
  time_commitment_min integer,
  days_per_week smallint,
  study_days text[] NOT NULL DEFAULT '{}'::text[],
  study_minutes_per_day integer,
  daily_quota_goal integer,
  exam_date date,
  goal_band numeric(2,1),
  weaknesses text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_channels text[] NOT NULL DEFAULT '{}'::text[],
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  phone text,
  phone_verified boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6) Teacher domain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed boolean NOT NULL DEFAULT false,
  approved boolean NOT NULL DEFAULT false,
  subjects text[] NOT NULL DEFAULT '{}'::text[],
  bio text,
  experience_years integer,
  cv_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7) Referrals domain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reward_cents integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  UNIQUE (referrer_user_id, referred_user_id)
);

-- ---------------------------------------------------------------------------
-- 8) Index strategy (analytics + dashboard centric)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_plan_status_idx ON public.subscriptions (plan_id, status);

CREATE INDEX IF NOT EXISTS score_history_user_occurred_idx ON public.score_history (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS score_history_occurred_idx ON public.score_history (occurred_at DESC);

CREATE INDEX IF NOT EXISTS streak_logs_user_date_idx ON public.streak_logs (user_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS ai_recommendations_user_active_idx
  ON public.ai_recommendations (user_id, active, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_diagnostics_user_created_idx
  ON public.ai_diagnostics (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_sessions_user_status_idx
  ON public.onboarding_sessions (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS referrals_referrer_status_idx ON public.referrals (referrer_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON public.referrals (referred_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 9) RLS strategy (owner-based, Supabase compatible)
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='plans_read_authenticated') THEN
    CREATE POLICY plans_read_authenticated ON public.plans FOR SELECT TO authenticated USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_owner_rw') THEN
    CREATE POLICY subscriptions_owner_rw ON public.subscriptions FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_scores' AND policyname='user_scores_owner_rw') THEN
    CREATE POLICY user_scores_owner_rw ON public.user_scores FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='score_history' AND policyname='score_history_owner_rw') THEN
    CREATE POLICY score_history_owner_rw ON public.score_history FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='streak_logs' AND policyname='streak_logs_owner_rw') THEN
    CREATE POLICY streak_logs_owner_rw ON public.streak_logs FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_recommendations' AND policyname='ai_recommendations_owner_rw') THEN
    CREATE POLICY ai_recommendations_owner_rw ON public.ai_recommendations FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_diagnostics' AND policyname='ai_diagnostics_owner_rw') THEN
    CREATE POLICY ai_diagnostics_owner_rw ON public.ai_diagnostics FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='onboarding_sessions' AND policyname='onboarding_sessions_owner_rw') THEN
    CREATE POLICY onboarding_sessions_owner_rw ON public.onboarding_sessions FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='user_preferences_owner_rw') THEN
    CREATE POLICY user_preferences_owner_rw ON public.user_preferences FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_settings' AND policyname='notification_settings_owner_rw') THEN
    CREATE POLICY notification_settings_owner_rw ON public.notification_settings FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='teacher_profiles' AND policyname='teacher_profiles_owner_rw') THEN
    CREATE POLICY teacher_profiles_owner_rw ON public.teacher_profiles FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='referrals' AND policyname='referrals_party_read') THEN
    CREATE POLICY referrals_party_read ON public.referrals FOR SELECT TO authenticated
      USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='referrals' AND policyname='referrals_referrer_insert') THEN
    CREATE POLICY referrals_referrer_insert ON public.referrals FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = referrer_user_id);
  END IF;
END $$;

-- 10) Profile column reduction is intentionally deferred until after
-- Task 3 data backfill migration completes.

COMMIT;
