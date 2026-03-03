-- Phase 4: full database security (RLS completion)
BEGIN;

CREATE SCHEMA IF NOT EXISTS public;

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
  profile_role text;
BEGIN
  jwt_role := lower(coalesce(auth.jwt()->>'role', auth.jwt()->'app_metadata'->>'role', ''));
  IF jwt_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT lower(coalesce(p.role, ''))
    INTO profile_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN profile_role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of(student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.class_members cm_student
    JOIN public.classes cl ON cl.id = cm_student.class_id
    JOIN public.coaches c ON c.id = cl.teacher_id
    WHERE cm_student.user_id = student_id
      AND c.user_id = auth.uid()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Ensure RLS enabled on sensitive tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mock_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.writing_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.speaking_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Profiles policies (owner + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='phase4_profiles_select_own') THEN
    CREATE POLICY "phase4_profiles_select_own" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='phase4_profiles_insert_own') THEN
    CREATE POLICY "phase4_profiles_insert_own" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='phase4_profiles_update_own') THEN
    CREATE POLICY "phase4_profiles_update_own" ON public.profiles
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='phase4_profiles_admin_all') THEN
    CREATE POLICY "phase4_profiles_admin_all" ON public.profiles
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Subscriptions policies (owner + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='phase4_subscriptions_select_own') THEN
    CREATE POLICY "phase4_subscriptions_select_own" ON public.subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='phase4_subscriptions_insert_own') THEN
    CREATE POLICY "phase4_subscriptions_insert_own" ON public.subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='phase4_subscriptions_update_own') THEN
    CREATE POLICY "phase4_subscriptions_update_own" ON public.subscriptions
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='phase4_subscriptions_admin_select_all') THEN
    CREATE POLICY "phase4_subscriptions_admin_select_all" ON public.subscriptions
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Usage tracking policies (owner + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_tracking' AND policyname='phase4_usage_tracking_select_own') THEN
    CREATE POLICY "phase4_usage_tracking_select_own" ON public.usage_tracking
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_tracking' AND policyname='phase4_usage_tracking_insert_own') THEN
    CREATE POLICY "phase4_usage_tracking_insert_own" ON public.usage_tracking
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_tracking' AND policyname='phase4_usage_tracking_update_own') THEN
    CREATE POLICY "phase4_usage_tracking_update_own" ON public.usage_tracking
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_tracking' AND policyname='phase4_usage_tracking_admin_select_all') THEN
    CREATE POLICY "phase4_usage_tracking_admin_select_all" ON public.usage_tracking
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Mock test results policies (owner + teacher + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mock_test_results' AND policyname='phase4_mock_results_select_own') THEN
    CREATE POLICY "phase4_mock_results_select_own" ON public.mock_test_results
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mock_test_results' AND policyname='phase4_mock_results_insert_own') THEN
    CREATE POLICY "phase4_mock_results_insert_own" ON public.mock_test_results
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mock_test_results' AND policyname='phase4_mock_results_update_own') THEN
    CREATE POLICY "phase4_mock_results_update_own" ON public.mock_test_results
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mock_test_results' AND policyname='phase4_mock_results_teacher_select') THEN
    CREATE POLICY "phase4_mock_results_teacher_select" ON public.mock_test_results
      FOR SELECT USING (public.is_teacher_of(user_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mock_test_results' AND policyname='phase4_mock_results_admin_all') THEN
    CREATE POLICY "phase4_mock_results_admin_all" ON public.mock_test_results
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Writing responses policies (owner + teacher + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='writing_responses' AND policyname='phase4_writing_responses_select_own') THEN
    CREATE POLICY "phase4_writing_responses_select_own" ON public.writing_responses
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='writing_responses' AND policyname='phase4_writing_responses_insert_own') THEN
    CREATE POLICY "phase4_writing_responses_insert_own" ON public.writing_responses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='writing_responses' AND policyname='phase4_writing_responses_update_own') THEN
    CREATE POLICY "phase4_writing_responses_update_own" ON public.writing_responses
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='writing_responses' AND policyname='phase4_writing_responses_delete_own') THEN
    CREATE POLICY "phase4_writing_responses_delete_own" ON public.writing_responses
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='writing_responses' AND policyname='phase4_writing_responses_teacher_select') THEN
    CREATE POLICY "phase4_writing_responses_teacher_select" ON public.writing_responses
      FOR SELECT USING (public.is_teacher_of(user_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='writing_responses' AND policyname='phase4_writing_responses_admin_all') THEN
    CREATE POLICY "phase4_writing_responses_admin_all" ON public.writing_responses
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Speaking attempts policies (owner + teacher + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='speaking_attempts' AND policyname='phase4_speaking_attempts_select_own') THEN
    CREATE POLICY "phase4_speaking_attempts_select_own" ON public.speaking_attempts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='speaking_attempts' AND policyname='phase4_speaking_attempts_insert_own') THEN
    CREATE POLICY "phase4_speaking_attempts_insert_own" ON public.speaking_attempts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='speaking_attempts' AND policyname='phase4_speaking_attempts_update_own') THEN
    CREATE POLICY "phase4_speaking_attempts_update_own" ON public.speaking_attempts
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='speaking_attempts' AND policyname='phase4_speaking_attempts_teacher_select') THEN
    CREATE POLICY "phase4_speaking_attempts_teacher_select" ON public.speaking_attempts
      FOR SELECT USING (public.is_teacher_of(user_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='speaking_attempts' AND policyname='phase4_speaking_attempts_admin_all') THEN
    CREATE POLICY "phase4_speaking_attempts_admin_all" ON public.speaking_attempts
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Account audit log policies (owner + admin)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.account_audit_log') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='account_audit_log' AND policyname='phase4_account_audit_select_own') THEN
    CREATE POLICY "phase4_account_audit_select_own" ON public.account_audit_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.account_audit_log') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='account_audit_log' AND policyname='phase4_account_audit_insert_own') THEN
    CREATE POLICY "phase4_account_audit_insert_own" ON public.account_audit_log
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.account_audit_log') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='account_audit_log' AND policyname='phase4_account_audit_admin_select_all') THEN
    CREATE POLICY "phase4_account_audit_admin_select_all" ON public.account_audit_log
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

COMMIT;
