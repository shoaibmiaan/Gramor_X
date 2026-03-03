-- Phase 2: subscription system refactor
BEGIN;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_pkey' AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id);
  END IF;
EXCEPTION WHEN others THEN
  -- keep existing PK shape if already present
  NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_id_uidx ON public.subscriptions(id);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx_v2 ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx_v2 ON public.subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_uidx ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

UPDATE public.subscriptions
SET
  current_period_end = COALESCE(current_period_end, renews_at),
  stripe_customer_id = COALESCE(stripe_customer_id, metadata->>'stripe_customer_id'),
  metadata = COALESCE(metadata, '{}'::jsonb),
  updated_at = COALESCE(updated_at, now())
WHERE true;

ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriptions_select_own" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "subscriptions_update_own" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE IF EXISTS public.profiles
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_expires_at,
  DROP COLUMN IF EXISTS premium_until,
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS membership,
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS tier;

COMMIT;
