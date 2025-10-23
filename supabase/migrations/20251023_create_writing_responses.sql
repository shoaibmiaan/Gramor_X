-- 20251023_create_writing_responses.sql
-- Ensure writing_responses table can store detailed scoring data per task and
-- link responses to the consolidated exam_attempts table.

-- Add columns if they do not yet exist (older schemas relied on attempts_writing).
alter table if exists public.writing_responses
  add column if not exists exam_attempt_id uuid references public.exam_attempts(id) on delete set null;

alter table if exists public.writing_responses
  add column if not exists task text check (task in ('task1','task2'));

alter table if exists public.writing_responses
  add column if not exists duration_seconds integer;

alter table if exists public.writing_responses
  add column if not exists evaluation_version text default 'v1';

alter table if exists public.writing_responses
  add column if not exists band_scores jsonb;

alter table if exists public.writing_responses
  add column if not exists feedback jsonb;

alter table if exists public.writing_responses
  add column if not exists tokens_used integer;

alter table if exists public.writing_responses
  add column if not exists submitted_at timestamptz;

create index if not exists writing_responses_exam_attempt_idx
  on public.writing_responses(exam_attempt_id);

create index if not exists writing_responses_task_idx
  on public.writing_responses(task);

comment on column public.writing_responses.exam_attempt_id is 'Links response to exam_attempts row when flow uses consolidated attempts table.';
comment on column public.writing_responses.task is 'Whether the essay corresponds to task 1 or task 2.';
comment on column public.writing_responses.band_scores is 'Raw band breakdown returned by AI scorer.';
comment on column public.writing_responses.feedback is 'Structured feedback payload shared with clients.';
comment on column public.writing_responses.tokens_used is 'LLM token usage metadata for analytics.';
comment on column public.writing_responses.submitted_at is 'Timestamp of the final submission event for this task.';

create unique index if not exists writing_responses_unique_attempt_task
  on public.writing_responses(exam_attempt_id, task)
  where exam_attempt_id is not null and task is not null;
