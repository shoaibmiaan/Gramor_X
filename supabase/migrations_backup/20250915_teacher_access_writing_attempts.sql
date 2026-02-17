-- Allow teachers to review writing attempts without owning them.
DO $$
BEGIN
  CREATE POLICY "Teachers read writing_attempts"
    ON public.writing_attempts
    FOR SELECT
    USING (auth.jwt()->>'role' IN ('teacher', 'admin'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END$$;
