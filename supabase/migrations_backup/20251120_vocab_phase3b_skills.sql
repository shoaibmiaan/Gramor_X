-- Phase 3B schema updates for writing and reading drills plus listening counters
alter table public.user_word_stats
  add column if not exists writing_attempts integer not null default 0,
  add column if not exists reading_attempts integer not null default 0,
  add column if not exists listening_attempts integer not null default 0;

create table if not exists public.word_writing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  item_type text not null check (item_type in ('word','collocation','gap')),
  prompt text not null,
  response text not null,
  tokens integer not null default 0,
  sentences integer not null default 0,
  collocations_used text[] not null default '{}'::text[],
  register_target text,
  checks jsonb not null default '{}'::jsonb,
  feedback text,
  score numeric(5,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists word_writing_attempts_user_idx
  on public.word_writing_attempts (user_id, word_id, created_at desc);

create table if not exists public.word_reading_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  item_type text not null check (item_type in ('word','collocation','gap')),
  passage text not null,
  blanks jsonb not null,
  responses jsonb not null,
  score numeric(5,2),
  feedback text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists word_reading_attempts_user_idx
  on public.word_reading_attempts (user_id, word_id, created_at desc);

create table if not exists public.word_listening_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  item_type text not null check (item_type in ('word','collocation','gap')),
  audio_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists word_listening_attempts_user_idx
  on public.word_listening_attempts (user_id, word_id, created_at desc);

alter table public.word_writing_attempts enable row level security;
alter table public.word_reading_attempts enable row level security;
alter table public.word_listening_attempts enable row level security;

create policy if not exists "word_writing_attempts_self_read" on public.word_writing_attempts
  for select
  using (auth.uid() = user_id);

create policy if not exists "word_writing_attempts_self_insert" on public.word_writing_attempts
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "word_writing_attempts_self_update" on public.word_writing_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "word_writing_attempts_self_delete" on public.word_writing_attempts
  for delete
  using (auth.uid() = user_id);

create policy if not exists "word_reading_attempts_self_read" on public.word_reading_attempts
  for select
  using (auth.uid() = user_id);

create policy if not exists "word_reading_attempts_self_insert" on public.word_reading_attempts
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "word_reading_attempts_self_update" on public.word_reading_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "word_reading_attempts_self_delete" on public.word_reading_attempts
  for delete
  using (auth.uid() = user_id);

create policy if not exists "word_listening_attempts_self_read" on public.word_listening_attempts
  for select
  using (auth.uid() = user_id);

create policy if not exists "word_listening_attempts_self_insert" on public.word_listening_attempts
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "word_listening_attempts_self_delete" on public.word_listening_attempts
  for delete
  using (auth.uid() = user_id);

drop trigger if exists trg_word_writing_attempts_updated on public.word_writing_attempts;
create trigger trg_word_writing_attempts_updated
before update on public.word_writing_attempts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_word_reading_attempts_updated on public.word_reading_attempts;
create trigger trg_word_reading_attempts_updated
before update on public.word_reading_attempts
for each row execute procedure public.set_updated_at();
