-- 20251023000001_create_exam_attempts_safe.sql
-- Safe, idempotent consolidated exam attempts table

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type text NOT NULL CHECK (exam_type IN ('reading','listening','writing','speaking')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded','archived')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  duration_seconds integer,
  goal_band numeric(3,1),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for exam_attempts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'exam_attempts_set_updated' AND tgrelid = 'public.exam_attempts'::regclass
  ) THEN
    CREATE TRIGGER exam_attempts_set_updated
      BEFORE UPDATE ON public.exam_attempts
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS exam_attempts_user_idx ON public.exam_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS exam_attempts_type_idx ON public.exam_attempts (exam_type);

-- Comments (idempotent)
DO $$
BEGIN
  EXECUTE 'COMMENT ON TABLE public.exam_attempts IS ''Master record for a user''''s mock exam attempt across skills.''';
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN public.exam_attempts.metadata IS ''Arbitrary payload such as prompt ids or device context.''';
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;