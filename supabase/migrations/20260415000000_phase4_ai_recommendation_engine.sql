-- Phase 4 / Task 8
-- AI recommendation engine hardening for structured recommendations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  priority smallint NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  consumed_at timestamptz,
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE IF EXISTS public.ai_recommendations
  ALTER COLUMN type SET DEFAULT 'study_plan',
  ALTER COLUMN content SET DEFAULT '{}'::jsonb,
  ALTER COLUMN active SET DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_recommendations_priority_range_check'
  ) THEN
    ALTER TABLE public.ai_recommendations
      ADD CONSTRAINT ai_recommendations_priority_range_check
      CHECK (priority BETWEEN 1 AND 10);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ai_recommendations_active_unconsumed_idx
  ON public.ai_recommendations (user_id, priority DESC, created_at DESC)
  WHERE active = true AND consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS ai_recommendations_expiry_idx
  ON public.ai_recommendations (expires_at)
  WHERE expires_at IS NOT NULL;

COMMIT;
