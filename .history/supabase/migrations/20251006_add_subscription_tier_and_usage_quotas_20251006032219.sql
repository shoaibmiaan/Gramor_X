-- Create enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'seedling', 'rocket', 'owl');

-- Add column to profiles (non-nullable, default 'free')
ALTER TABLE public.profiles
ADD COLUMN tier public.subscription_tier DEFAULT 'free';

-- Backfill existing users to 'free' (if any rows exist without tier)
UPDATE public.profiles SET tier = 'free' WHERE tier IS NULL;

-- Make non-nullable
ALTER TABLE public.profiles ALTER COLUMN tier SET NOT NULL;

-- Example RLS for tier-gated tables (adjust for your tables, e.g., content)
-- Enable RLS if not already
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT own content; Owl tier sees all
CREATE POLICY "Tiered content access" ON public.content
FOR SELECT USING (
  auth.uid() = user_id  -- Own content
  OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) = 'owl'  -- Admins see all
);

-- Similar for other tables (e.g., bookings: Rocket+ only)
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Tiered bookings access" ON public.bookings
-- FOR ALL USING (
--   (SELECT tier FROM public.profiles WHERE id = auth.uid()) IN ('rocket', 'owl')
--   OR auth.uid() = user_id
-- );