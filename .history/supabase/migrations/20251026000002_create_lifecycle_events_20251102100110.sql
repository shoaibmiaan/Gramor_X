-- 20251026000002_create_lifecycle_events_safe.sql
-- Safe, idempotent queue table for lifecycle notification worker

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('first_mock_done','band_up','streak_broken')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  channels text[] NOT NULL DEFAULT '{}'::text[],
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  processed_at timestamptz,
  last_attempt_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS lifecycle_events_status_idx
  ON public.lifecycle_events (status, created_at ASC);

CREATE INDEX IF NOT EXISTS lifecycle_events_user_idx
  ON public.lifecycle_events (user_id, event);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_events_dedupe_idx
  ON public.lifecycle_events (user_id, event, COALESCE(dedupe_key, ''));

-- Enable RLS
ALTER TABLE IF EXISTS public.lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lifecycle_events' AND policyname = 'lifecycle_events_owner_read'
  ) THEN
    CREATE POLICY "lifecycle_events_owner_read"
      ON public.lifecycle_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lifecycle_events' AND policyname = 'lifecycle_events_owner_write'
  ) THEN
    CREATE POLICY "lifecycle_events_owner_write"
      ON public.lifecycle_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lifecycle_events' AND policyname = 'lifecycle_events_owner_update'
  ) THEN
    CREATE POLICY "lifecycle_events_owner_update"
      ON public.lifecycle_events
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;