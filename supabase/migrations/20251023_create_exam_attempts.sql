-- 20251023_create_exam_attempts.sql
-- Consolidated exam attempts table shared across reading/listening/writing modules.

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_type text not null check (exam_type in ('reading','listening','writing','speaking')),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','graded','archived')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds integer,
  goal_band numeric(3,1),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger if not exists exam_attempts_set_updated
  before update on public.exam_attempts
  for each row execute procedure public.set_updated_at();

create index if not exists exam_attempts_user_idx on public.exam_attempts(user_id, created_at desc);
create index if not exists exam_attempts_type_idx on public.exam_attempts(exam_type);

comment on table public.exam_attempts is 'Master record for a user''s mock exam attempt across skills.';
comment on column public.exam_attempts.metadata is 'Arbitrary payload such as prompt ids or device context.';
