create table if not exists public.reading_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id text not null,
  passage_id text not null,
  ranges jsonb not null default '[]'::jsonb,
  note_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reading_notes_user_attempt_idx
  on public.reading_notes (user_id, attempt_id);

create index if not exists reading_notes_passage_idx
  on public.reading_notes (passage_id);

alter table public.reading_notes enable row level security;

create policy if not exists "Users can read own reading notes"
  on public.reading_notes for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own reading notes"
  on public.reading_notes for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own reading notes"
  on public.reading_notes for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own reading notes"
  on public.reading_notes for delete
  using (auth.uid() = user_id);

create trigger set_reading_notes_updated_at
  before update on public.reading_notes
  for each row
  execute procedure public.set_updated_at();
