-- Create content table (basic schema – adjust fields based on app types, e.g., from '@/types/content')
CREATE TABLE IF NOT EXISTS public.content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'article',  -- e.g., 'article', 'video', 'quiz'
  content JSONB,  -- Or TEXT for body
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- Tiered policies: Own content always; Owl sees all; Rocket+ can insert premium
CREATE POLICY "Own content access" ON public.content
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Owl full access" ON public.content
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tier = 'owl')
);

CREATE POLICY "Rocket premium insert" ON public.content
FOR INSERT WITH CHECK (
  NOT (is_premium = true AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tier IN ('rocket', 'owl')))
);