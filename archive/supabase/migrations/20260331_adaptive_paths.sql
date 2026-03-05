-- 20260331_adaptive_paths.sql
-- Schema for adaptive study path recommender tables and seed content.

-- ─────────────────────────────────────────────────────────────
-- Safety: ensure UUID + helper trigger function exist
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := timezone('utc', now());
  END IF;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- learning_tasks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  module text NOT NULL CHECK (module IN ('listening','reading','writing','speaking','vocab')),
  type text NOT NULL CHECK (type IN ('drill','mock','lesson','review')),
  est_minutes integer NOT NULL CHECK (est_minutes > 0),
  tags text[] NOT NULL DEFAULT '{}',
  difficulty text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_plan text NOT NULL DEFAULT 'free' CHECK (min_plan IN ('free','starter','booster','master')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_tasks_module_idx
  ON public.learning_tasks (module, type, is_active)
  WHERE is_active;

DROP TRIGGER IF EXISTS learning_tasks_touch_updated ON public.learning_tasks;
CREATE TRIGGER learning_tasks_touch_updated
  BEFORE UPDATE ON public.learning_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.learning_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read learning tasks" ON public.learning_tasks;
CREATE POLICY "Anyone can read learning tasks"
  ON public.learning_tasks
  FOR SELECT
  USING (is_active);

DROP POLICY IF EXISTS "Staff manage learning tasks" ON public.learning_tasks;
CREATE POLICY "Staff manage learning tasks"
  ON public.learning_tasks
  FOR ALL
  USING (auth.jwt()->>'role' IN ('admin','teacher'))
  WITH CHECK (auth.jwt()->>'role' IN ('admin','teacher'));

-- ─────────────────────────────────────────────────────────────
-- learning_signals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_signals (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('listening','reading','writing','speaking','vocab')),
  key text NOT NULL,
  value numeric NOT NULL,
  source text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_signals_user_idx
  ON public.learning_signals (user_id, module, occurred_at DESC);

ALTER TABLE public.learning_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their learning signals" ON public.learning_signals;
CREATE POLICY "Users read their learning signals"
  ON public.learning_signals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert learning signals" ON public.learning_signals;
CREATE POLICY "Users insert learning signals"
  ON public.learning_signals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their learning signals" ON public.learning_signals;
CREATE POLICY "Users manage their learning signals"
  ON public.learning_signals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their learning signals" ON public.learning_signals;
CREATE POLICY "Users delete their learning signals"
  ON public.learning_signals
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- learning_profiles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_band numeric,
  speaking_pron numeric,
  speaking_fluency numeric,
  reading_tfng numeric,
  reading_mcq numeric,
  writing_task2 numeric,
  vocab_range numeric,
  listening_accuracy numeric,
  last_updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS learning_profiles_touch_updated ON public.learning_profiles;
CREATE TRIGGER learning_profiles_touch_updated
  BEFORE UPDATE ON public.learning_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their learning profile" ON public.learning_profiles;
CREATE POLICY "Users read their learning profile"
  ON public.learning_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert their learning profile" ON public.learning_profiles;
CREATE POLICY "Users upsert their learning profile"
  ON public.learning_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their learning profile" ON public.learning_profiles;
CREATE POLICY "Users update their learning profile"
  ON public.learning_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- recommendations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.learning_tasks(id) ON DELETE CASCADE,
  reason text NOT NULL,
  score numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','shown','accepted','skipped','completed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS recommendations_user_idx
  ON public.recommendations (user_id, created_at DESC);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their recommendations" ON public.recommendations;
CREATE POLICY "Users read their recommendations"
  ON public.recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert recommendations" ON public.recommendations;
CREATE POLICY "Users insert recommendations"
  ON public.recommendations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their recommendations" ON public.recommendations;
CREATE POLICY "Users update their recommendations"
  ON public.recommendations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- task_runs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.learning_tasks(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  outcome jsonb,
  band_delta numeric,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS task_runs_user_idx
  ON public.task_runs (user_id, started_at DESC);

ALTER TABLE public.task_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their task runs" ON public.task_runs;
CREATE POLICY "Users read their task runs"
  ON public.task_runs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert task runs" ON public.task_runs;
CREATE POLICY "Users insert task runs"
  ON public.task_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their task runs" ON public.task_runs;
CREATE POLICY "Users update their task runs"
  ON public.task_runs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their task runs" ON public.task_runs;
CREATE POLICY "Users delete their task runs"
  ON public.task_runs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Seed core learning tasks (idempotent upsert by slug)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.learning_tasks (slug, module, type, est_minutes, tags, difficulty, metadata, min_plan)
VALUES
  ('speaking-ipa-th','speaking','drill',10, ARRAY['focus:speaking_pron','ipa:/θ/','band<7'],'B2',
    jsonb_build_object('title','Polish your /θ/ sound','summary','Targeted IPA drill with contrast pairs and playback.','deeplink','/speaking/coach/ipa-th'),'starter'),
  ('speaking-fluency-paced','speaking','drill',12, ARRAY['focus:speaking_fluency','pace','fillers'],'B2',
    jsonb_build_object('title','Fluency tempo workout','summary','Metronome-guided response practice to reduce fillers.','deeplink','/speaking/coach/fluency'),'free'),
  ('speaking-cue-card-confidence','speaking','mock',15, ARRAY['focus:speaking_structure','cue-card'],'C1',
    jsonb_build_object('title','Cue card confidence run','summary','Two-minute cue card practice with structure prompts.','deeplink','/speaking/coach/free'),'starter'),
  ('reading-tfng-pack1','reading','drill',12, ARRAY['focus:reading_tfng','band<6.5'],'B2',
    jsonb_build_object('title','True/False/Not Given pack','summary','10-question micro set with explained answers.','deeplink','/reading/drills/tfng-pack1'),'free'),
  ('reading-skim-speed','reading','lesson',8, ARRAY['focus:reading_speed','strategy'],'B1',
    jsonb_build_object('title','Skimming for speed','summary','Guided skim tactics with stopwatch challenges.','deeplink','/reading/lessons/skimming'),'free'),
  ('reading-mcq-precision','reading','drill',14, ARRAY['focus:reading_mcq','band<7'],'B2',
    jsonb_build_object('title','MCQ accuracy booster','summary','Practice 8 medium MCQs with explanation stack.','deeplink','/reading/drills/mcq-precision'),'starter'),
  ('writing-task2-outline-discipline','writing','lesson',15, ARRAY['focus:writing_task2','planning'],'C1',
    jsonb_build_object('title','Task 2 outline discipline','summary','Rapid planning reps with examiner checklists.','deeplink','/writing/lessons/task2-outline'),'starter'),
  ('writing-task1-trend-language','writing','review',12, ARRAY['focus:writing_overview','task1'],'B2',
    jsonb_build_object('title','Task 1 trend language review','summary','Upgrade overview sentences with model comparisons.','deeplink','/writing/review/task1-trend-language'),'free'),
  ('listening-map-matching','listening','drill',10, ARRAY['focus:listening_map','band<6.5'],'B1',
    jsonb_build_object('title','Map matching sprint','summary','Section 2 map tasks with accent variety.','deeplink','/listening/drills/map-matching'),'free'),
  ('listening-distractor-awareness','listening','lesson',9, ARRAY['focus:listening_detail','distractors'],'B2',
    jsonb_build_object('title','Distractor awareness tune-up','summary','Spot common traps with guided audio breakdowns.','deeplink','/listening/lessons/distractors'),'free'),
  ('vocab-range-collocations','vocab','drill',6, ARRAY['focus:vocab_range','collocation'],'B2',
    jsonb_build_object('title','Collocation burst','summary','Rapid-fire pairing for high-yield collocations.','deeplink','/vocabulary/drills/collocations'),'free'),
  ('vocab-academic-band7','vocab','lesson',10, ARRAY['focus:vocab_band7','academic'],'C1',
    jsonb_build_object('title','Academic lexis pack','summary','Band 7+ academic vocabulary with usage notes.','deeplink','/vocabulary/packs/academic-band7'),'starter')
ON CONFLICT (slug) DO UPDATE
SET module    = EXCLUDED.module,
    type      = EXCLUDED.type,
    est_minutes = EXCLUDED.est_minutes,
    tags      = EXCLUDED.tags,
    difficulty= EXCLUDED.difficulty,
    metadata  = EXCLUDED.metadata,
    min_plan  = EXCLUDED.min_plan,
    is_active = EXCLUDED.is_active,
    updated_at= timezone('utc', now());
