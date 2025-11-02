-- 20251026195702_fix_listening_responses_rls_safe.sql
-- Safe, idempotent auto-fix RLS for listening_responses

-- Ensure functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role','') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role','') = 'teacher';
$$;

-- Enable RLS if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) THEN
    ALTER TABLE public.listening_responses ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix policies (idempotent)
DO $$
DECLARE
  has_user_id boolean;
  has_profile_id boolean;
  has_attempt_id boolean;
BEGIN
  -- Drop broken policy if exists and table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) THEN
    DROP POLICY IF EXISTS "Students manage own listening_responses" ON public.listening_responses;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listening_responses' AND column_name='user_id'
  ) INTO has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listening_responses' AND column_name='profile_id'
  ) INTO has_profile_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listening_responses' AND column_name='attempt_id'
  ) INTO has_attempt_id;

  -- Admin policy
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listening_responses' AND policyname = 'listening_responses_admin_all'
  ) THEN
    CREATE POLICY "listening_responses_admin_all"
      ON public.listening_responses
      FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF has_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listening_responses' AND policyname = 'listening_responses_self_user_id'
    ) THEN
      CREATE POLICY "listening_responses_self_user_id"
        ON public.listening_responses
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;

  ELSIF has_profile_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listening_responses' AND policyname = 'listening_responses_self_profile_id'
    ) THEN
      CREATE POLICY "listening_responses_self_profile_id"
        ON public.listening_responses
        FOR ALL TO authenticated
        USING (profile_id = auth.uid())
        WITH CHECK (profile_id = auth.uid());
    END IF;

  ELSIF has_attempt_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listening_responses' AND policyname = 'listening_responses_own_via_attempt'
    ) THEN
      CREATE POLICY "listening_responses_own_via_attempt"
        ON public.listening_responses
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            WHERE ea.id = listening_responses.attempt_id
              AND ea.user_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            WHERE ea.id = listening_responses.attempt_id
              AND ea.user_id = auth.uid()
          )
        );
    END IF;

  ELSE
    RAISE NOTICE 'No user_id/profile_id/attempt_id on listening_responses; manual review needed.';
  END IF;

  -- Teacher read policy
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listening_responses'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listening_responses' AND policyname = 'listening_responses_teacher_read'
  ) THEN
    CREATE POLICY "listening_responses_teacher_read"
      ON public.listening_responses
      FOR SELECT TO authenticated
      USING (is_teacher() OR is_admin());
  END IF;
END;
$$ LANGUAGE plpgsql;