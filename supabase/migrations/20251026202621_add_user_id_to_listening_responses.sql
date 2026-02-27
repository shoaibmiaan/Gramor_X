-- 20251026202903_add_user_id_listening_responses_safe.sql
-- Safe addition of user_id to listening_responses with backfill

-- Add column
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

-- Backfill (placeholder; adjust logic as needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) THEN
    UPDATE public.listening_responses
    SET user_id = (SELECT user_id FROM some_related_table WHERE id = listening_responses.some_id)
    WHERE user_id IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Make non-nullable if appropriate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) THEN
    ALTER TABLE public.listening_responses
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Re-apply policy (idempotent)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students manage own listening_responses" ON public.listening_responses;
  CREATE POLICY "Students manage own listening_responses"
    ON public.listening_responses
    FOR ALL TO authenticated
    USING (auth.uid() = user_id AND (auth.jwt()->>'role')::text IN ('student','teacher'))
    WITH CHECK (auth.uid() = user_id AND (auth.jwt()->>'role')::text IN ('student','teacher'));
EXCEPTION WHEN OTHERS THEN null;
END;
$$ LANGUAGE plpgsql;