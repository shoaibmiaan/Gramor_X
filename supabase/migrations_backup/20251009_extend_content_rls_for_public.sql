-- Add visibility for public free content (null user_id + !premium)
CREATE POLICY IF NOT EXISTS "Public free content access" ON public.content
FOR SELECT USING (
  (user_id IS NULL AND is_premium = false)
);

-- Allow any to INSERT public free (no user_id)
CREATE POLICY IF NOT EXISTS "Public free insert" ON public.content
FOR INSERT WITH CHECK (
  (user_id IS NULL AND is_premium = false)  -- Public free OK
  OR (user_id = auth.uid() AND (NOT is_premium OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tier IN ('rocket', 'owl'))))  -- Own or premium gated
);