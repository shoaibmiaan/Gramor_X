-- Add RLS policies for tiered access (idempotent & safe if content table not present)

DO $$
BEGIN
  -- only proceed if the "content" table exists
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'content' AND n.nspname = 'public'
  ) THEN

    -- create the policy only if it doesn't already exist for the table
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Tiered content access'
    ) THEN
      CREATE POLICY "Tiered content access" ON public.content
        FOR ALL
        USING (
          auth.uid() = user_id
          OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) = 'owl'
        )
        WITH CHECK (
          auth.uid() = user_id
          OR (SELECT tier FROM public.profiles WHERE id = auth.uid()) IN ('rocket','owl')
        );
    END IF;

  END IF;
END
$$;
