-- Extend SELECT for public free content (null user_id + !premium)
CREATE POLICY "Public free content access" ON public.content
FOR SELECT USING (
  (user_id IS NULL AND is_premium = false)
);