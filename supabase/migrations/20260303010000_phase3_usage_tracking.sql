-- Phase 3: usage tracking + limits enforcement foundation
BEGIN;

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT timezone('utc', now())::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, date)
);

CREATE INDEX IF NOT EXISTS usage_tracking_user_id_idx ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS usage_tracking_date_idx ON public.usage_tracking(date);
CREATE INDEX IF NOT EXISTS usage_tracking_feature_idx ON public.usage_tracking(feature);

ALTER TABLE IF EXISTS public.usage_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "usage_tracking_select_own" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_tracking_insert_own" ON public.usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_tracking_update_own" ON public.usage_tracking
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_tracking_service_all" ON public.usage_tracking
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
