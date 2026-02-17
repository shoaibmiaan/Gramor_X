CREATE TABLE IF NOT EXISTS public.whatsapp_tasks (
  id uuid PRIMARY KEY,
  user_id uuid,
  text text NOT NULL,
  scheduled_at timestamptz,
  delivered boolean DEFAULT false,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_user ON public.whatsapp_tasks(user_id);

