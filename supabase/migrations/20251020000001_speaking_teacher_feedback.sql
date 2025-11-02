-- 20251020000001_speaking_teacher_feedback_safe.sql
-- Safe, idempotent migration to add teacher feedback fields to speaking_attempts

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0) Ensure minimal public.profiles exists for FK reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 1) Add columns if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'speaking_attempts'
  ) THEN
    ALTER TABLE public.speaking_attempts
      ADD COLUMN IF NOT EXISTS teacher_feedback text,
      ADD COLUMN IF NOT EXISTS teacher_feedback_at timestamptz;
    
    -- Add FK column only if profiles exists (which it now does)
    ALTER TABLE public.speaking_attempts
      ADD COLUMN IF NOT EXISTS teacher_feedback_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
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