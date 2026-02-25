-- 20251026000001_create_experiments_safe.sql
-- Safe, idempotent core experiment tables

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

-- Create experiments table
CREATE TABLE IF NOT EXISTS public.experiments (
  key text PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed','disabled')),
  default_variant text NOT NULL DEFAULT 'control',
  traffic_percentage integer NOT NULL DEFAULT 100 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Trigger for experiments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'experiments_set_updated' AND tgrelid = 'public.experiments'::regclass
  ) THEN
    CREATE TRIGGER experiments_set_updated
      BEFORE UPDATE ON public.experiments
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Create experiment_variants table
CREATE TABLE IF NOT EXISTS public.experiment_variants (
  id bigserial PRIMARY KEY,
  experiment_key text NOT NULL REFERENCES public.experiments(key) ON DELETE CASCADE,
  variant text NOT NULL,
  weight integer NOT NULL DEFAULT 0 CHECK (weight >= 0),
  is_default boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT experiment_variants_unique UNIQUE (experiment_key, variant)
);

-- Trigger for experiment_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'experiment_variants_set_updated' AND tgrelid = 'public.experiment_variants'::regclass
  ) THEN
    CREATE TRIGGER experiment_variants_set_updated
      BEFORE UPDATE ON public.experiment_variants
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Index for experiment_variants
CREATE INDEX IF NOT EXISTS experiment_variants_experiment_idx
  ON public.experiment_variants (experiment_key);

-- Create experiment_assignments table
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_key text NOT NULL REFERENCES public.experiments(key) ON DELETE CASCADE,
  variant text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  guardrail_state text NOT NULL DEFAULT 'active' CHECK (guardrail_state IN ('active','disabled')),
  exposures integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  last_exposed_at timestamptz,
  last_converted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT experiment_assignments_unique UNIQUE (user_id, experiment_key)
);

-- Trigger for experiment_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'experiment_assignments_set_updated' AND tgrelid = 'public.experiment_assignments'::regclass
  ) THEN
    CREATE TRIGGER experiment_assignments_set_updated
      BEFORE UPDATE ON public.experiment_assignments
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Index for experiment_assignments
CREATE INDEX IF NOT EXISTS experiment_assignments_experiment_idx
  ON public.experiment_assignments (experiment_key, assigned_at DESC);

-- Create experiment_events table
CREATE TABLE IF NOT EXISTS public.experiment_events (
  id bigserial PRIMARY KEY,
  experiment_key text NOT NULL REFERENCES public.experiments(key) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  variant text NOT NULL,
  event text NOT NULL CHECK (event IN ('assign','expose','convert')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for experiment_events
CREATE INDEX IF NOT EXISTS experiment_events_experiment_idx
  ON public.experiment_events (experiment_key, recorded_at DESC);

CREATE INDEX IF NOT EXISTS experiment_events_user_idx
  ON public.experiment_events (user_id, experiment_key, recorded_at DESC);

-- Enable RLS
ALTER TABLE IF EXISTS public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.experiment_events ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiments') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiments' AND policyname='experiments_read') THEN
    CREATE POLICY "experiments_read"
      ON public.experiments
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiment_variants') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiment_variants' AND policyname='experiment_variants_read') THEN
    CREATE POLICY "experiment_variants_read"
      ON public.experiment_variants
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiment_assignments') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiment_assignments' AND policyname='experiment_assignments_self') THEN
    CREATE POLICY "experiment_assignments_self"
      ON public.experiment_assignments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiment_assignments') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiment_assignments' AND policyname='experiment_assignments_self_insert') THEN
    CREATE POLICY "experiment_assignments_self_insert"
      ON public.experiment_assignments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiment_assignments') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiment_assignments' AND policyname='experiment_assignments_self_update') THEN
    CREATE POLICY "experiment_assignments_self_update"
      ON public.experiment_assignments
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiment_events') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiment_events' AND policyname='experiment_events_self_read') THEN
    CREATE POLICY "experiment_events_self_read"
      ON public.experiment_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='experiment_events') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='experiment_events' AND policyname='experiment_events_self_insert') THEN
    CREATE POLICY "experiment_events_self_insert"
      ON public.experiment_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;