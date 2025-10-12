-- Phase 3 schema updates for vocabulary speaking drills
alter table public.user_word_stats
  add column if not exists pron_attempts integer not null default 0;

create table if not exists public.word_example_audio (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references public.word_examples(id) on delete cascade,
  audio_url jsonb not null default '{}'::jsonb,
  tts_provider text,
  voice text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists word_example_audio_example_idx
  on public.word_example_audio (example_id);

drop trigger if exists trg_word_example_audio_updated on public.word_example_audio;
create trigger trg_word_example_audio_updated
before update on public.word_example_audio
for each row execute procedure public.set_updated_at();

create table if not exists public.word_pron_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  example_id uuid references public.word_examples(id) on delete set null,
  item_type text not null check (item_type in ('word','collocation','gap')),
  audio_blob_url text,
  score numeric(5,3),
  transcript text,
  target_text text,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists word_pron_attempts_user_idx
  on public.word_pron_attempts (user_id, word_id, created_at desc);

alter table public.word_example_audio enable row level security;
alter table public.word_pron_attempts enable row level security;

create policy if not exists "word_example_audio_public_read" on public.word_example_audio
  for select
  using (true);

create policy if not exists "word_example_audio_service_write" on public.word_example_audio
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "word_pron_attempts_self_read" on public.word_pron_attempts
  for select
  using (auth.uid() = user_id);

create policy if not exists "word_pron_attempts_self_write" on public.word_pron_attempts
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "word_pron_attempts_self_update" on public.word_pron_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "word_pron_attempts_self_delete" on public.word_pron_attempts
  for delete
  using (auth.uid() = user_id);
