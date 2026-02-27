-- migrations/0005_create_study_sessions.sql
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY,
  user_id uuid,
  items jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id);
