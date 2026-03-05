CREATE TABLE IF NOT EXISTS public.ai_logs (
  id bigserial PRIMARY KEY,
  user_id uuid,
  request jsonb,
  response jsonb,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id bigserial PRIMARY KEY,
  user_id uuid,
  suggestion_id text,
  created_at timestamptz DEFAULT now()
);
