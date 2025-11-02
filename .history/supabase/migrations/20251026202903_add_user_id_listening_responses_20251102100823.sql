-- 20251026202621_add_user_id_to_listening_responses_safe.sql
-- Safe addition of user_id to listening_responses

-- Add column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) THEN
    ALTER TABLE public.listening_responses
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Re-apply policy (idempotent)
DO $$
BEGIN
  CREATE POLICY IF NOT EXISTS "Students manage own listening_responses"
    ON public.listening_responses
    FOR ALL TO authenticated
    USING (auth.uid() = user_id AND (auth.jwt()->>'role')::text IN ('student','teacher'))
    WITH CHECK (auth.uid() = user_id AND (auth.jwt()->>'role')::text IN ('student','teacher'));
EXCEPTION WHEN duplicate_object THEN null;
END;
$$ LANGUAGE plpgsql;