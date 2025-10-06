-- Migration: Add subscription_tier ENUM, profiles.tier column, backfill from existing Stripe fields,
-- extend usage_counters for quotas, and sample RLS policies.
-- Run: npx supabase db push (dev first)

BEGIN;

-- 1. Create ENUM (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('free', 'seedling', 'rocket', 'owl');
  END IF;
END $$;

-- 2. Add tier column to profiles (default 'free'; idempotent)
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS tier subscription_tier DEFAULT 'free';

-- 3. Backfill tiers (derive from plan_id, subscription_status, premium_until)
-- First, inspect for tuning (uncomment to run once):
-- SELECT DISTINCT plan_id, subscription_status, COUNT(*) FROM profiles GROUP BY plan_id, subscription_status ORDER BY COUNT(*) DESC LIMIT 10;

UPDATE public.profiles 
SET tier = CASE 
  -- Tune LIKE patterns based on inspect query above
  WHEN plan_id IS NULL OR subscription_status = 'inactive' OR (premium_until IS NOT NULL AND premium_until < NOW()) THEN 'free'
  WHEN plan_id ILIKE '%seedling%' OR (subscription_status = 'active' AND plan_id ILIKE '%basic%') THEN 'seedling'
  WHEN plan_id ILIKE '%rocket%' OR (subscription_status = 'active' AND plan_id ILIKE '%pro%') THEN 'rocket'
  WHEN plan_id ILIKE '%owl%' OR premium_until > NOW() THEN 'owl'
  ELSE 'free'
END
WHERE tier IS NULL OR tier = 'free';  -- Safe for defaults

-- Verify backfill (comment out post-run)
-- SELECT tier, COUNT(*) AS users FROM profiles GROUP BY tier ORDER BY COUNT(*) DESC;

-- 4. Extend usage_counters (assume exists; add quota columns idempotently)
-- Inspect schema first (uncomment):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usage_counters';

ALTER TABLE IF EXISTS public.usage_counters
ADD COLUMN IF NOT EXISTS period date DEFAULT date_trunc('month', now())::date,
ADD COLUMN IF NOT EXISTS limit_ integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS tier subscription_tier DEFAULT 'free';

-- Backfill existing counters (join profiles for limits)
UPDATE public.usage_counters uc
SET 
  period = COALESCE(uc.period, date_trunc('month', uc.created_at)::date),
  limit_ = CASE p.tier
    WHEN 'free' THEN 0
    WHEN 'seedling' THEN 5  -- AI/month
    WHEN 'rocket' THEN 20   -- e.g., bookings
    WHEN 'owl' THEN NULL    -- Unlimited
  END,
  tier = COALESCE(uc.tier, p.tier)
FROM public.profiles p
WHERE uc.user_id = p.id 
  AND (uc.limit_ IS NULL OR uc.tier IS NULL OR uc.period IS NULL);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_usage_user_period_feature 
ON public.usage_counters (user_id, period, feature);

-- RLS for usage_counters (if missing)
ALTER TABLE IF EXISTS public.usage_counters ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_counters' AND policyname = 'Own usage only') THEN
    CREATE POLICY "Own usage only" ON public.usage_counters
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Sample RLS for tier gating (e.g., content; repeat for bookings/classes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content' AND policyname = 'Tiered content select') THEN
    CREATE POLICY "Tiered content select" ON public.content
    FOR SELECT USING (
      auth.uid() = user_id OR 
      (SELECT tier::text FROM profiles WHERE id = auth.uid()) >= 'seedling'
    );
  END IF;
END $$;

-- Repeat similar for bookings (rocket+ insert), etc., as needed.

COMMIT;