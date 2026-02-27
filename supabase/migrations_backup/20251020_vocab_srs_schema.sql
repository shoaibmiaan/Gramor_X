-- Phase 1 vocabulary SRS data model
create extension if not exists "pgcrypto";

-- Ensure new descriptive columns exist on public.words
alter table public.words
  add column if not exists headword text,
  add column if not exists pos text,
  add column if not exists definition text,
  add column if not exists freq_rank integer,
  add column if not exists ielts_topics text[] default '{}'::text[],
  add column if not exists register text,
  add column if not exists cefr text;

update public.words
set headword = coalesce(headword, word),
    definition = coalesce(definition, meaning);

update public.words
set register = lower(register)
where register is not null;

update public.words
set cefr = upper(cefr)
where cefr is not null;

alter table public.words
  alter column headword set not null,
  alter column definition set not null;

create index if not exists words_headword_lower_idx
  on public.words (lower(headword));

alter table public.words
  add constraint words_register_check
    check (register is null or register in ('formal','neutral')),
  add constraint words_cefr_check
    check (cefr is null or cefr in ('B1','B2','C1'));

create or replace function public.words_sync_columns()
returns trigger
language plpgsql
as $$
begin
  if new.headword is null and new.word is not null then
    new.headword := new.word;
  elsif new.word is null and new.headword is not null then
    new.word := new.headword;
  end if;

  if new.definition is null and new.meaning is not null then
    new.definition := new.meaning;
  elsif new.meaning is null and new.definition is not null then
    new.meaning := new.definition;
  end if;

  if new.register is not null then
    new.register := lower(new.register);
  end if;

  if new.cefr is not null then
    new.cefr := upper(new.cefr);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_words_sync_columns on public.words;
create trigger trg_words_sync_columns
before insert or update on public.words
for each row execute procedure public.words_sync_columns();

-- Vocabulary example sentences tied to each word
create table if not exists public.word_examples (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  text text not null,
  source text not null check (source in ('ielts_reading','crafted')),
  is_gap_ready boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists word_examples_word_idx on public.word_examples (word_id);

-- Multi-word collocations associated with a headword
create table if not exists public.word_collocations (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  chunk text not null,
  pattern text not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists word_collocations_word_idx on public.word_collocations (word_id);

-- Audio + phonetics for each vocabulary item
create table if not exists public.word_audio (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  ipa text,
  audio_url jsonb default '{}'::jsonb,
  tts_provider text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists word_audio_word_idx on public.word_audio (word_id);

-- Per-user spaced repetition stats
create table if not exists public.user_word_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  status text not null check (status in ('new','learning','mastered','suspended')),
  ef double precision not null default 2.3,
  streak_correct integer not null default 0,
  last_result text check (last_result in ('pass','fail')),
  last_seen_at timestamptz,
  next_due_at timestamptz,
  interval_days integer not null default 0,
  ease smallint not null default 2 check (ease between 1 and 4),
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  constraint user_word_stats_pkey primary key (user_id, word_id)
);

create index if not exists user_word_stats_due_idx
  on public.user_word_stats (user_id, next_due_at);

-- Review queue to power scheduling engine
create table if not exists public.review_queue (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('word','collocation','gap')),
  item_ref_id uuid not null,
  due_at timestamptz not null,
  priority integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint review_queue_pkey primary key (user_id, item_type, item_ref_id)
);

create index if not exists review_queue_due_idx
  on public.review_queue (user_id, due_at, priority desc);

-- Badges + awards
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  constraint user_badges_pkey primary key (user_id, badge_id)
);

-- Daily leaderboard snapshots
create table if not exists public.leaderboards_daily (
  id bigserial primary key,
  snapshot_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank integer not null,
  score integer not null,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create unique index if not exists leaderboards_daily_unique
  on public.leaderboards_daily (snapshot_date, user_id);

-- User preferences for vocabulary study
create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  focus_skill text[] default '{}'::text[],
  target_band numeric(2,1),
  daily_quota_words integer not null default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_word_examples_updated on public.word_examples;
create trigger trg_word_examples_updated
before update on public.word_examples
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_word_collocations_updated on public.word_collocations;
create trigger trg_word_collocations_updated
before update on public.word_collocations
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_word_audio_updated on public.word_audio;
create trigger trg_word_audio_updated
before update on public.word_audio
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_word_stats_updated on public.user_word_stats;
create trigger trg_user_word_stats_updated
before update on public.user_word_stats
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_review_queue_updated on public.review_queue;
create trigger trg_review_queue_updated
before update on public.review_queue
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_badges_updated on public.badges;
create trigger trg_badges_updated
before update on public.badges
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_prefs_updated on public.user_prefs;
create trigger trg_user_prefs_updated
before update on public.user_prefs
for each row execute procedure public.set_updated_at();

-- Enable row level security and default policies
alter table public.words enable row level security;
alter table public.word_examples enable row level security;
alter table public.word_collocations enable row level security;
alter table public.word_audio enable row level security;
alter table public.user_word_stats enable row level security;
alter table public.review_queue enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.leaderboards_daily enable row level security;
alter table public.user_prefs enable row level security;

-- Allow read access to public vocabulary catalog tables
do $$
begin
  create policy "words_public_read" on public.words
    for select using (true);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "word_examples_public_read" on public.word_examples
    for select using (true);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "word_collocations_public_read" on public.word_collocations
    for select using (true);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "word_audio_public_read" on public.word_audio
    for select using (true);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "badges_public_read" on public.badges
    for select using (true);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "words_service_write" on public.words
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

-- Service role write access for catalog data
do $$
begin
  create policy "word_examples_service_write" on public.word_examples
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "word_collocations_service_write" on public.word_collocations
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "word_audio_service_write" on public.word_audio
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "badges_service_write" on public.badges
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "user_badges_service_write" on public.user_badges
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "leaderboards_daily_service_write" on public.leaderboards_daily
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

-- User owned data policies
do $$
begin
  create policy "user_word_stats_self_access" on public.user_word_stats
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "review_queue_self_access" on public.review_queue
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "user_badges_self_access" on public.user_badges
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "user_prefs_self_access" on public.user_prefs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "leaderboards_daily_self_read" on public.leaderboards_daily
    for select using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end$$;
