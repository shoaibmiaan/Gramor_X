-- 20251020_speaking_teacher_feedback_safe.sql
-- Safe, idempotent migration to add teacher feedback fields to speaking_attempts

-- 1) Add columns if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'speaking_attempts'
  ) THEN
    ALTER TABLE public.speaking_attempts
      ADD COLUMN IF NOT EXISTS teacher_feedback text,
      ADD COLUMN IF NOT EXISTS teacher_feedback_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS teacher_feedback_at timestamptz;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2) Manage policy idempotently
DO $$
BEGIN
  -- Drop if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'speaking_attempts' AND policyname = 'Staff read speaking_attempts'
  ) THEN
    DROP POLICY IF EXISTS "Staff read speaking_attempts" ON public.speaking_attempts;
  END IF;

  -- Create if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'speaking_attempts' AND policyname = 'Staff read speaking_attempts'
  ) THEN
    CREATE POLICY "Staff read speaking_attempts"
      ON public.speaking_attempts
      FOR SELECT
      USING (auth.jwt()->>'role' IN ('teacher','admin'));
  END IF;
END;
$$ LANGUAGE plpgsql;