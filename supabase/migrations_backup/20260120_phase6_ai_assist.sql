-- Phase 6 AI Assist logging
create table if not exists public.ai_assist_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null check (feature in ('paraphrase','speaking_hint')),
  input text not null,
  output jsonb,
  tokens_used integer,
  created_at timestamptz default now()
);

alter table public.ai_assist_logs enable row level security;

create policy if not exists "Service manages AI assist logs" on public.ai_assist_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists idx_ai_assist_logs_user_created
  on public.ai_assist_logs (user_id, created_at desc);
