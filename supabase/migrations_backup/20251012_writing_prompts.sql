-- Writing prompts and responses schema

create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt_text text not null,
  prompt_type text,
  sample_answer text,
  rubric_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp
  before update on public.writing_prompts
  for each row
  execute procedure public.set_updated_at();

create table if not exists public.writing_responses (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.writing_prompts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response_text text not null,
  word_count integer,
  overall_score numeric(3,1),
  task_response_score numeric(3,1),
  coherence_score numeric(3,1),
  lexical_score numeric(3,1),
  grammar_score numeric(3,1),
  feedback jsonb,
  submitted_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp
  before update on public.writing_responses
  for each row
  execute procedure public.set_updated_at();

alter table if exists public.writing_prompts enable row level security;
alter table if exists public.writing_responses enable row level security;

create policy if not exists "Public read writing_prompts"
  on public.writing_prompts
  for select
  using (true);

create policy if not exists "Teachers manage writing_prompts"
  on public.writing_prompts
  for all
  using (auth.jwt()->>'role' in ('teacher','admin'))
  with check (auth.jwt()->>'role' in ('teacher','admin'));

create policy if not exists "Students manage own writing_responses"
  on public.writing_responses
  for all
  using (auth.uid() = user_id and auth.jwt()->>'role' in ('student','teacher'))
  with check (auth.uid() = user_id and auth.jwt()->>'role' in ('student','teacher'));

create policy if not exists "Teachers manage writing_responses"
  on public.writing_responses
  for all
  using (auth.jwt()->>'role' in ('teacher','admin'))
  with check (auth.jwt()->>'role' in ('teacher','admin'));
