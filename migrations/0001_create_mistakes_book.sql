-- Create table to store user mistakes
CREATE TABLE IF NOT EXISTS public.mistakes_book (
  id uuid PRIMARY KEY,
  user_id uuid,
  type text NOT NULL,
  source text,
  excerpt text,
  tags text[],
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for queries by user
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes_book(user_id);

