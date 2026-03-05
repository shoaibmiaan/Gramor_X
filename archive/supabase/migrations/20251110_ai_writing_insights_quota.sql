-- Add usage key + plan limits for AI Writing Insights
-- Admins are bypassed in app logic; this just defines plan quotas.

-- 1) Ensure enum value exists
ALTER TYPE public.usage_key ADD VALUE IF NOT EXISTS 'ai.writing.insights';

-- 2) Seed limits if missing (idempotent)
INSERT INTO public.plan_limits (plan_id, key, per_day, per_month)
SELECT * FROM (VALUES
  ('free',    'ai.writing.insights'::public.usage_key, 2,  NULL),
  ('starter', 'ai.writing.insights'::public.usage_key, 5,  NULL),
  ('booster', 'ai.writing.insights'::public.usage_key, 20, NULL),
  ('master',  'ai.writing.insights'::public.usage_key, NULL, NULL)  -- unlimited
) v(plan_id, key, per_day, per_month)
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_limits pl
  WHERE pl.plan_id = v.plan_id AND pl.key = v.key
);

COMMENT ON COLUMN public.plan_limits.per_day IS 'NULL = unlimited';
COMMENT ON COLUMN public.plan_limits.per_month IS 'NULL = unlimited';
