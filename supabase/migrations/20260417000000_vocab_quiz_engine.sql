-- Vocab quiz engine persistence (sessions, responses, results, vocab profile)

create table if not exists public.quiz_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_session_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists quiz_events_user_created_idx
  on public.quiz_events (user_id, created_at desc);

create index if not exists quiz_events_session_idx
  on public.quiz_events (quiz_session_id, created_at desc);

create table if not exists public.vocab_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_session_id uuid not null unique,
  questions jsonb not null,
  duration_seconds integer not null default 60 check (duration_seconds > 0 and duration_seconds <= 120),
  status text not null default 'active' check (status in ('active', 'submitted', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vocab_quiz_sessions_user_created_idx
  on public.vocab_quiz_sessions (user_id, created_at desc);

create index if not exists vocab_quiz_sessions_status_expires_idx
  on public.vocab_quiz_sessions (status, expires_at asc);

create table if not exists public.vocab_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_session_id uuid not null references public.vocab_quiz_sessions(quiz_session_id) on delete cascade,
  question_id text not null,
  selected_index integer not null,
  response_time_ms integer not null default 0 check (response_time_ms >= 0 and response_time_ms <= 60000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists vocab_quiz_answers_user_session_idx
  on public.vocab_quiz_answers (user_id, quiz_session_id, created_at asc);

create index if not exists vocab_quiz_answers_session_idx
  on public.vocab_quiz_answers (quiz_session_id, created_at asc);

create table if not exists public.vocab_quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_session_id uuid not null unique references public.vocab_quiz_sessions(quiz_session_id) on delete cascade,
  score_correct integer not null default 0,
  score_total integer not null default 0,
  accuracy numeric(6, 3) not null default 0,
  weighted_accuracy numeric(6, 3) not null default 0,
  avg_response_ms integer not null default 0,
  result_payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists vocab_quiz_results_user_submitted_idx
  on public.vocab_quiz_results (user_id, submitted_at desc);

create table if not exists public.user_vocab_profile (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  last_seen timestamptz not null default timezone('utc', now()),
  strength_score numeric(6, 3) not null default 0,
  difficulty text,
  response_time_ms integer,
  source text default 'vocab_quiz',
  latest_quiz_session_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, word_id),
  constraint user_vocab_profile_counts_check
    check (attempts >= 0 and correct_count >= 0 and correct_count <= attempts)
);

create index if not exists user_vocab_profile_strength_idx
  on public.user_vocab_profile (user_id, strength_score asc);

create index if not exists user_vocab_profile_last_seen_idx
  on public.user_vocab_profile (user_id, last_seen desc);

-- Keep updated_at in sync

drop trigger if exists trg_vocab_quiz_sessions_updated on public.vocab_quiz_sessions;
create trigger trg_vocab_quiz_sessions_updated
before update on public.vocab_quiz_sessions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_vocab_profile_updated on public.user_vocab_profile;
create trigger trg_user_vocab_profile_updated
before update on public.user_vocab_profile
for each row execute procedure public.set_updated_at();

-- Row level security
alter table public.quiz_events enable row level security;
alter table public.vocab_quiz_sessions enable row level security;
alter table public.vocab_quiz_answers enable row level security;
alter table public.vocab_quiz_results enable row level security;
alter table public.user_vocab_profile enable row level security;

create policy if not exists "quiz_events_self_read" on public.quiz_events
  for select
  using (auth.uid() = user_id);

create policy if not exists "quiz_events_service_write" on public.quiz_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "vocab_quiz_sessions_self_read" on public.vocab_quiz_sessions
  for select
  using (auth.uid() = user_id);

create policy if not exists "vocab_quiz_sessions_service_write" on public.vocab_quiz_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "vocab_quiz_answers_self_read" on public.vocab_quiz_answers
  for select
  using (auth.uid() = user_id);

create policy if not exists "vocab_quiz_answers_service_write" on public.vocab_quiz_answers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "vocab_quiz_results_self_read" on public.vocab_quiz_results
  for select
  using (auth.uid() = user_id);

create policy if not exists "vocab_quiz_results_service_write" on public.vocab_quiz_results
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "user_vocab_profile_self_read" on public.user_vocab_profile
  for select
  using (auth.uid() = user_id);

create policy if not exists "user_vocab_profile_service_write" on public.user_vocab_profile
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
