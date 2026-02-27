-- supabase/migrations/20251007000002_create_content_table_and_rls.sql
-- create content table (idempotent) and add RLS policies (guarded if profiles missing)

-- NOTE: keep the table definition minimal but include the columns referenced by policies.
CREATE TABLE IF NOT EXISTS public.content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  body jsonb,
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- enable row level security idempotently
ALTER TABLE IF EXISTS public.content ENABLE ROW LEVEL SECURITY;

-- Create policies that do NOT depend on profiles (safe to create anytime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Own content access'
  ) THEN
    CREATE POLICY "Own content access"
      ON public.content
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;

  -- other simple policies (no profiles reference) could go here
END
$$;

-- Policies that reference public.profiles: only create them if public.profiles exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Owl full access'
    ) THEN
      CREATE POLICY "Owl full access" ON public.content
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND tier = 'owl'
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Rocket premium insert'
    ) THEN
      CREATE POLICY "Rocket premium insert" ON public.content
        FOR INSERT
        WITH CHECK (
          NOT (
            is_premium = true
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND tier IN ('rocket','owl')
            )
          )
        );
    END IF;

    -- Tiered content access policy (if you still want it here)
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
