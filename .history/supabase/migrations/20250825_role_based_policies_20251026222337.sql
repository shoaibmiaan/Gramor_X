-- ------------------------------------------------------------------
-- 20250825_role_based_policies.sql
-- Minimal guard fix (no schema changes)
-- ------------------------------------------------------------------

DO $$
BEGIN
  -- Only drop policies if the table actually exists
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Students manage own profile" ON public.profiles;
  END IF;
END$$;

-- Ensure RLS enabled if table exists
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins can manage profiles"
      ON public.profiles
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'role') = 'admin')
      WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

    CREATE POLICY "Students manage own profile"
      ON public.profiles
      FOR ALL
      TO public
      USING ((auth.uid() = id) AND (auth.jwt() ->> 'role') = 'student')
      WITH CHECK ((auth.uid() = id) AND (auth.jwt() ->> 'role') = 'student');
  END IF;
END$$;
