-- 023_writing_responses.sql
-- Store AI scoring outputs for writing submissions.

create table if not exists public.writing_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid references public.attempts_writing(id) on delete set null,
  prompt_id text,
  task_type text,
  answer_text text not null,
  word_count integer,
  ai_model text,
  overall_band numeric(3,1),
  task_response_band numeric(3,1),
  coherence_band numeric(3,1),
  lexical_band numeric(3,1),
  grammar_band numeric(3,1),
  feedback_summary text,
  feedback_strengths text[] default array[]::text[],
  feedback_improvements text[] default array[]::text[],
  raw_response jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.writing_responses enable row level security;

do $$ begin
  create policy "writing_responses_owner_rw" on public.writing_responses
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists writing_responses_user_idx on public.writing_responses(user_id, created_at desc);
create index if not exists writing_responses_attempt_idx on public.writing_responses(attempt_id);
