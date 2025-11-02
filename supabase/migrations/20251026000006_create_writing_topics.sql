-- 20251026000006_create_writing_topics_safe.sql
-- Safe, idempotent admin-managed catalog of writing prompts

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

SET check_function_bodies = off;

-- Create writing_topics table if not exists
CREATE TABLE IF NOT EXISTS public.writing_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  prompt text NOT NULL,
  band_target numeric(3,1) NOT NULL CHECK (band_target BETWEEN 4.0 AND 9.0),
  tags text[] NOT NULL DEFAULT '{}'::text[],
  difficulty text NOT NULL CHECK (difficulty IN ('starter','intermediate','advanced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS writing_topics_band_idx ON public.writing_topics (band_target);
CREATE INDEX IF NOT EXISTS writing_topics_difficulty_idx ON public.writing_topics (difficulty);
CREATE INDEX IF NOT EXISTS writing_topics_tags_gin ON public.writing_topics USING GIN (tags);

-- Trigger (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'writing_topics_set_updated' AND tgrelid = 'public.writing_topics'::regclass
  ) THEN
    CREATE TRIGGER writing_topics_set_updated
      BEFORE UPDATE ON public.writing_topics
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Enable RLS
ALTER TABLE IF EXISTS public.writing_topics ENABLE ROW LEVEL SECURITY;

-- Policy (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'writing_topics' AND policyname = 'admins manage writing topics'
  ) THEN
    CREATE POLICY "admins manage writing topics"
      ON public.writing_topics
      FOR ALL
      TO authenticated
      USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
      WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
  END IF;
END;
$$;

-- Comments (idempotent)
DO $$
BEGIN
  EXECUTE 'COMMENT ON TABLE public.writing_topics IS ''Admin curated IELTS writing prompts with band targets and tags.''';
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN public.writing_topics.prompt IS ''Full question text shown to learners.''';
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;