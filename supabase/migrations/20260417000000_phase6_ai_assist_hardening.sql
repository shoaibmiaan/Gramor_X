-- Phase 6 / AI Assist hardening
-- Expands logging fidelity and serving indexes for AI assist features.

BEGIN;

ALTER TABLE IF EXISTS public.ai_assist_logs
  ADD COLUMN IF NOT EXISTS model_provider text,
  ADD COLUMN IF NOT EXISTS model_name text,
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS ai_assist_logs_feature_created_idx
  ON public.ai_assist_logs (feature, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_assist_logs_user_feature_created_idx
  ON public.ai_assist_logs (user_id, feature, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_assist_logs'
      AND policyname = 'Users can read own ai assist logs'
  ) THEN
    CREATE POLICY "Users can read own ai assist logs"
      ON public.ai_assist_logs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

COMMIT;
