-- Enums
CREATE TYPE public.subscription_tier AS ENUM ('free', 'seedling', 'rocket', 'owl');

-- Add to profiles
ALTER TABLE public.profiles ADD COLUMN tier public.subscription_tier DEFAULT 'free';

-- Backfill
UPDATE public.profiles SET tier = 'free' WHERE tier IS NULL;

-- Enforce non-null
ALTER TABLE public.profiles ALTER COLUMN tier SET NOT NULL;

-- TODO: Add RLS for tier-gated tables once they exist (e.g., content, bookings)
-- Example (uncomment after creating tables):
/*
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public content access" ON public.content;
CREATE POLICY "Tiered content access" ON public.content
FOR SELECT USING (
  auth.uid() = user_id
  OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) = 'owl'
)
FOR INSERT WITH CHECK (auth.uid() = user_id OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) IN ('rocket', 'owl'))
FOR UPDATE USING (auth.uid() = user_id OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) = 'owl');
*/