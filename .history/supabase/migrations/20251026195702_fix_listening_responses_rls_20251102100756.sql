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

-- Enable RLS
ALTER TABLE IF EXISTS public.listening_responses ENABLE ROW LEVEL SECURITY;

-- Fix policies (idempotent)
DO $$
DECLARE
  has_user_id boolean;
  has_profile_id boolean;
  has_attempt_id boolean;
BEGIN
  -- Drop broken policy if exists
  DROP POLICY IF EXISTS "Students manage own listening_responses" ON public.listening_responses;

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
  CREATE POLICY IF NOT EXISTS "listening_responses_admin_all"
    ON public.listening_responses
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

  IF has_user_id THEN
    CREATE POLICY IF NOT EXISTS "listening_responses_self_user_id"
      ON public.listening_responses
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  ELSIF has_profile_id THEN
    CREATE POLICY IF NOT EXISTS "listening_responses_self_profile_id"
      ON public.listening_responses
      FOR ALL TO authenticated
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  ELSIF has_attempt_id THEN
    CREATE POLICY IF NOT EXISTS "listening_responses_own_via_attempt"
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
  ELSE
    RAISE NOTICE 'No user_id/profile_id/attempt_id on listening_responses; manual review needed.';
  END IF;

  -- Teacher read policy
  CREATE POLICY IF NOT EXISTS "listening_responses_teacher_read"
    ON public.listening_responses
    FOR SELECT TO authenticated
    USING (is_teacher() OR is_admin());
END;
$$ LANGUAGE plpgsql;