-- 20251023000002_create_exam_events_safe.sql
-- Safe, idempotent event log for exam telemetry

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.exam_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('start','autosave','submit','focus','blur','typing','score')),
  payload jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exam_events'
  ) THEN
    -- Add attempt_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'attempt_id'
    ) THEN
      ALTER TABLE public.exam_events
        ADD COLUMN attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE;
    END IF;

    -- Add user_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.exam_events
        ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add event_type if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'event_type'
    ) THEN
      ALTER TABLE public.exam_events
        ADD COLUMN event_type text NOT NULL;
    END IF;

    -- Add payload if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'payload'
    ) THEN
      ALTER TABLE public.exam_events
        ADD COLUMN payload jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- Add occurred_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'occurred_at'
    ) THEN
      ALTER TABLE public.exam_events
        ADD COLUMN occurred_at timestamptz NOT NULL DEFAULT now();
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.exam_events
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;

    -- Add event_type check constraint if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'exam_events_event_type_check' AND conrelid = 'public.exam_events'::regclass
    ) THEN
      ALTER TABLE public.exam_events
        ADD CONSTRAINT exam_events_event_type_check CHECK (event_type IN ('start','autosave','submit','focus','blur','typing','score'));
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes (conditional on column existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'attempt_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'occurred_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS exam_events_attempt_idx
      ON public.exam_events (attempt_id, occurred_at DESC);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS exam_events_user_idx
      ON public.exam_events (user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'event_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS exam_events_type_idx
      ON public.exam_events (event_type);
  END IF;
END;
$$;

-- Comments (idempotent, conditional on existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exam_events'
  ) THEN
    EXECUTE 'COMMENT ON TABLE public.exam_events IS ''Telemetry for autosave, focus and scoring events for mock exams.''';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_events' AND column_name = 'payload'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN public.exam_events.payload IS ''JSON payload storing free-form metadata such as draft text or timings.''';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;