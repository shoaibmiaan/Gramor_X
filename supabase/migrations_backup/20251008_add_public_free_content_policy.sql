-- Allow SELECT for public free content (null user_id + !premium)
CREATE POLICY "Public free content access" ON public.content
FOR SELECT USING (
  (user_id IS NULL AND is_premium = false)
);

-- Optional: INSERT check for public (any tier can create free public)
CREATE POLICY "Public free insert" ON public.content
FOR INSERT WITH CHECK (
  (user_id IS NULL AND is_premium = false)
  OR (user_id = auth.uid())  -- Or own
);