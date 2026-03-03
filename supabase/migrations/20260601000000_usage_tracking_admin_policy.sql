-- EPIC 3.1 hardening follow-up: grant admin visibility into usage tracking.
BEGIN;

DO $$ BEGIN
  CREATE POLICY "usage_tracking_admin_all" ON public.usage_tracking
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
