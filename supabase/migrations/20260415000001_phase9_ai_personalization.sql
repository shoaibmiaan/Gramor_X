-- Phase 9: AI personalization, predictive analytics, and public API foundations

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 9.1.1 user skill profile model
CREATE TABLE IF NOT EXISTS public.user_skill_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  proficiency jsonb NOT NULL DEFAULT '{}'::jsonb,
  weakness_tags text[] NOT NULL DEFAULT '{}',
  learning_pace numeric NOT NULL DEFAULT 0,
  preferred_exercise_types text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS user_skill_profiles_gin_idx ON public.user_skill_profiles USING gin (proficiency);
CREATE INDEX IF NOT EXISTS user_skill_profiles_weakness_idx ON public.user_skill_profiles USING gin (weakness_tags);

ALTER TABLE public.user_skill_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own skill profile" ON public.user_skill_profiles;
CREATE POLICY "Users read own skill profile" ON public.user_skill_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert own skill profile" ON public.user_skill_profiles;
CREATE POLICY "Users upsert own skill profile" ON public.user_skill_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper function to refresh one profile heuristically
CREATE OR REPLACE FUNCTION public.refresh_user_skill_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reading numeric := 0;
  v_writing numeric := 0;
  v_speaking numeric := 0;
  v_listening numeric := 0;
  v_avg_recent numeric := 0;
  v_avg_prev numeric := 0;
  v_learning_pace numeric := 0;
  v_pref_types text[] := '{}';
  v_weaknesses text[] := '{}';
BEGIN
  SELECT COALESCE(AVG(CASE WHEN skill='reading' THEN score END), 0),
         COALESCE(AVG(CASE WHEN skill='writing' THEN score END), 0),
         COALESCE(AVG(CASE WHEN skill='speaking' THEN score END), 0),
         COALESCE(AVG(CASE WHEN skill='listening' THEN score END), 0)
  INTO v_reading, v_writing, v_speaking, v_listening
  FROM (
    SELECT lower(COALESCE(category, '')) AS skill, band AS score
    FROM public.score_history
    WHERE user_id = p_user_id AND band IS NOT NULL
    ORDER BY occurred_at DESC
    LIMIT 100
  ) scores;

  SELECT COALESCE(AVG(band), 0) INTO v_avg_recent
  FROM (
    SELECT band
    FROM public.score_history
    WHERE user_id = p_user_id AND band IS NOT NULL
    ORDER BY occurred_at DESC
    LIMIT 10
  ) latest;

  SELECT COALESCE(AVG(band), 0) INTO v_avg_prev
  FROM (
    SELECT band
    FROM public.score_history
    WHERE user_id = p_user_id AND band IS NOT NULL
    ORDER BY occurred_at DESC
    OFFSET 10
    LIMIT 10
  ) prev;

  v_learning_pace := v_avg_recent - v_avg_prev;

  SELECT COALESCE(array_agg(type ORDER BY cnt DESC), '{}') INTO v_pref_types
  FROM (
    SELECT t.type, COUNT(*) AS cnt
    FROM public.task_runs tr
    JOIN public.learning_tasks t ON t.id = tr.task_id
    WHERE tr.user_id = p_user_id
    GROUP BY t.type
  ) pref;

  IF v_reading < 6.5 THEN v_weaknesses := array_append(v_weaknesses, 'time management in reading'); END IF;
  IF v_writing < 6.5 THEN v_weaknesses := array_append(v_weaknesses, 'lexical resource in writing'); END IF;
  IF v_speaking < 6.5 THEN v_weaknesses := array_append(v_weaknesses, 'fluency and coherence in speaking'); END IF;
  IF v_listening < 6.5 THEN v_weaknesses := array_append(v_weaknesses, 'detail detection in listening'); END IF;

  INSERT INTO public.user_skill_profiles (
    user_id,
    proficiency,
    weakness_tags,
    learning_pace,
    preferred_exercise_types,
    metadata,
    calculated_at,
    updated_at
  )
  VALUES (
    p_user_id,
    jsonb_build_object(
      'reading', ROUND(v_reading::numeric, 2),
      'writing', ROUND(v_writing::numeric, 2),
      'speaking', ROUND(v_speaking::numeric, 2),
      'listening', ROUND(v_listening::numeric, 2)
    ),
    v_weaknesses,
    ROUND(v_learning_pace::numeric, 3),
    v_pref_types,
    jsonb_build_object('source', 'phase9-nightly', 'band_window', 20),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    proficiency = EXCLUDED.proficiency,
    weakness_tags = EXCLUDED.weakness_tags,
    learning_pace = EXCLUDED.learning_pace,
    preferred_exercise_types = EXCLUDED.preferred_exercise_types,
    metadata = EXCLUDED.metadata,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_all_user_skill_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  u record;
  processed integer := 0;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    PERFORM public.refresh_user_skill_profile(u.id);
    processed := processed + 1;
  END LOOP;
  RETURN processed;
END;
$$;

-- 9.4 light analytics warehouse table
CREATE TABLE IF NOT EXISTS public.analytics_daily (
  day date PRIMARY KEY,
  dau integer NOT NULL DEFAULT 0,
  new_signups integer NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  churn_rate numeric NOT NULL DEFAULT 0,
  mrr numeric NOT NULL DEFAULT 0,
  total_ai_requests integer NOT NULL DEFAULT 0,
  avg_test_score numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read analytics daily" ON public.analytics_daily;
CREATE POLICY "Admins read analytics daily" ON public.analytics_daily
  FOR SELECT USING (auth.jwt()->>'role' IN ('admin','teacher'));

-- 9.5 feedback ratings loop
CREATE TABLE IF NOT EXISTS public.feedback_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_type text NOT NULL CHECK (submission_type IN ('writing','speaking')),
  submission_id uuid NOT NULL,
  feedback_id text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  admin_status text NOT NULL DEFAULT 'new' CHECK (admin_status IN ('new','reviewed','escalated')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS feedback_ratings_submission_idx ON public.feedback_ratings (submission_type, submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_ratings_admin_status_idx ON public.feedback_ratings (admin_status, created_at DESC);

ALTER TABLE public.feedback_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own feedback ratings" ON public.feedback_ratings;
CREATE POLICY "Users manage own feedback ratings" ON public.feedback_ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read feedback ratings" ON public.feedback_ratings;
CREATE POLICY "Admins read feedback ratings" ON public.feedback_ratings
  FOR SELECT USING (auth.jwt()->>'role' IN ('admin','teacher'));

DROP POLICY IF EXISTS "Admins update feedback ratings" ON public.feedback_ratings;
CREATE POLICY "Admins update feedback ratings" ON public.feedback_ratings
  FOR UPDATE USING (auth.jwt()->>'role' IN ('admin','teacher')) WITH CHECK (auth.jwt()->>'role' IN ('admin','teacher'));

-- 9.6 public API authentication and webhooks
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_uq ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON public.api_keys (user_id, created_at DESC);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own api keys" ON public.api_keys;
CREATE POLICY "Users manage own api keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS webhooks_user_idx ON public.webhooks (user_id, created_at DESC);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own webhooks" ON public.webhooks;
CREATE POLICY "Users manage own webhooks" ON public.webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
