-- 20251023_create_exam_events.sql
-- Event log capturing autosave and telemetry for mock exams.

create table if not exists public.exam_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('start','autosave','submit','focus','blur','typing','score')), 
  payload jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists exam_events_attempt_idx on public.exam_events(attempt_id, occurred_at desc);
create index if not exists exam_events_user_idx on public.exam_events(user_id);
create index if not exists exam_events_type_idx on public.exam_events(event_type);

comment on table public.exam_events is 'Telemetry for autosave, focus and scoring events for mock exams.';
comment on column public.exam_events.payload is 'JSON payload storing free-form metadata such as draft text or timings.';
