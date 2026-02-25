-- 20251026202621_add_user_id_to_listening_responses_safe.sql
-- Safe addition of user_id to listening_responses

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add column if table exists (nullable, no default as auth.uid() not allowed in column default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) THEN
    ALTER TABLE public.listening_responses
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Re-apply policy (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listening_responses' AND policyname = 'Students manage own listening_responses'
  ) THEN
    CREATE POLICY "Students manage own listening_responses"
      ON public.listening_responses
      FOR ALL TO authenticated
      USING (auth.uid() = user_id AND (auth.jwt()->>'role')::text IN ('student','teacher'))
      WITH CHECK (auth.uid() = user_id AND (auth.jwt()->>'role')::text IN ('student','teacher'));
  END IF;
END;
$$ LANGUAGE plpgsql;