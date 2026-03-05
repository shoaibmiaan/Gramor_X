-- RLS for content (repeat pattern for bookings, classes, etc.)
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public content access" ON public.content;
CREATE POLICY "Tiered content access" ON public.content
FOR SELECT USING (
  auth.uid() = user_id
  OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) = 'owl'
)
FOR INSERT WITH CHECK (auth.uid() = user_id OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) IN ('rocket', 'owl'))
FOR UPDATE USING (auth.uid() = user_id OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) = 'owl');

-- Example for bookings (Rocket+ access)
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Tiered bookings access" ON public.bookings
-- FOR ALL USING (
--   (SELECT tier FROM public.profiles WHERE id = auth.uid()) IN ('rocket', 'owl')
--   OR auth.uid() = user_id
-- );