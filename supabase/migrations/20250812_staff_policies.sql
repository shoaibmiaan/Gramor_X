-- policies/staff
-- Ensure admin and teacher roles can manage any user profile

alter table if exists public.user_profiles enable row level security;

DO $$
BEGIN
  -- idempotent: drop old if exists
  BEGIN
    DROP POLICY IF EXISTS "staff can manage all user_profiles" ON public.user_profiles;
  EXCEPTION WHEN undefined_table THEN
    -- table may not exist yet in some environments
    NULL;
  END;

  CREATE POLICY "staff can manage all user_profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','teacher'))
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','teacher'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN duplicate_object THEN
    NULL;
END$$;
