-- ─────────────────────────────────────────────────────────────────────────────
-- Safety helpers
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' then
    new.updated_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- speaking_exercises
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.speaking_exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  level text not null check (level in ('B1','B2','C1','C2')),
  type text not null check (type in ('phoneme','word','sentence','cue_card')),
  prompt text not null,
  ipa text,
  target_wpm integer,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists speaking_exercises_level_idx
  on public.speaking_exercises (level, type);

drop trigger if exists speaking_exercises_touch_updated on public.speaking_exercises;
create trigger speaking_exercises_touch_updated
  before update on public.speaking_exercises
  for each row
  execute function public.touch_updated_at();

alter table public.speaking_exercises enable row level security;

drop policy if exists "Anyone can read speaking exercises" on public.speaking_exercises;
create policy "Anyone can read speaking exercises"
  on public.speaking_exercises
  for select using (true);

drop policy if exists "Staff manage speaking exercises" on public.speaking_exercises;
create policy "Staff manage speaking exercises"
  on public.speaking_exercises
  for all
  using (auth.jwt()->>'role' in ('admin','teacher'))
  with check (auth.jwt()->>'role' in ('admin','teacher'));

-- ─────────────────────────────────────────────────────────────────────────────
-- speaking_attempts (repair drift: ensure exercise_id column + FK)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- exercise_id might be missing on older table versions; we add it below.
  ref_type text not null check (ref_type in ('exercise','free_speech')),
  ref_text text,
  audio_path text not null,
  duration_ms integer not null check (duration_ms > 0),
  wpm numeric,
  fillers_count integer default 0,
  overall_pron numeric,
  overall_intonation numeric,
  overall_stress numeric,
  overall_fluency numeric,
  band_estimate numeric,
  engine jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Add the column if missing
alter table public.speaking_attempts
  add column if not exists exercise_id uuid;

-- Add/ensure the FK (idempotent via DO block)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'speaking_attempts'
      and c.conname = 'speaking_attempts_exercise_id_fkey'
  ) then
    alter table public.speaking_attempts
      add constraint speaking_attempts_exercise_id_fkey
      foreign key (exercise_id)
      references public.speaking_exercises(id)
      on delete set null;
  end if;
end$$;

-- Indexes
create index if not exists speaking_attempts_user_idx
  on public.speaking_attempts (user_id, created_at desc);

create index if not exists speaking_attempts_exercise_idx
  on public.speaking_attempts (exercise_id, created_at desc);

-- Trigger
drop trigger if exists speaking_attempts_touch_updated on public.speaking_attempts;
create trigger speaking_attempts_touch_updated
  before update on public.speaking_attempts
  for each row
  execute function public.touch_updated_at();

-- RLS
alter table public.speaking_attempts enable row level security;

drop policy if exists "Users select their speaking attempts" on public.speaking_attempts;
create policy "Users select their speaking attempts"
  on public.speaking_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert speaking attempts" on public.speaking_attempts;
create policy "Users insert speaking attempts"
  on public.speaking_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their speaking attempts" on public.speaking_attempts;
create policy "Users update their speaking attempts"
  on public.speaking_attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their speaking attempts" on public.speaking_attempts;
create policy "Users delete their speaking attempts"
  on public.speaking_attempts for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- speaking_segments
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.speaking_segments (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.speaking_attempts(id) on delete cascade,
  token_type text not null check (token_type in ('word','phoneme')),
  token text not null,
  start_ms integer not null,
  end_ms integer not null,
  accuracy numeric,
  stress_ok boolean,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists speaking_segments_attempt_idx
  on public.speaking_segments (attempt_id, token_type, start_ms);

alter table public.speaking_segments enable row level security;

drop policy if exists "Attempt owners read segments" on public.speaking_segments;
create policy "Attempt owners read segments"
  on public.speaking_segments for select
  using (
    exists (
      select 1 from public.speaking_attempts a
      where a.id = speaking_segments.attempt_id
        and auth.uid() = a.user_id
    )
  );

drop policy if exists "Attempt owners insert segments" on public.speaking_segments;
create policy "Attempt owners insert segments"
  on public.speaking_segments for insert
  with check (
    exists (
      select 1 from public.speaking_attempts a
      where a.id = speaking_segments.attempt_id
        and auth.uid() = a.user_id
    )
  );

drop policy if exists "Attempt owners update segments" on public.speaking_segments;
create policy "Attempt owners update segments"
  on public.speaking_segments for update
  using (
    exists (
      select 1 from public.speaking_attempts a
      where a.id = speaking_segments.attempt_id
        and auth.uid() = a.user_id
    )
  )
  with check (
    exists (
      select 1 from public.speaking_attempts a
      where a.id = speaking_segments.attempt_id
        and auth.uid() = a.user_id
    )
  );

drop policy if exists "Attempt owners delete segments" on public.speaking_segments;
create policy "Attempt owners delete segments"
  on public.speaking_segments for delete
  using (
    exists (
      select 1 from public.speaking_attempts a
      where a.id = speaking_segments.attempt_id
        and auth.uid() = a.user_id
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- speaking_pron_goals
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.speaking_pron_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ipa text not null,
  target_accuracy numeric not null default 0.85,
  current_accuracy numeric,
  last_practiced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, ipa)
);

create index if not exists speaking_pron_goals_user_idx
  on public.speaking_pron_goals (user_id, ipa);

drop trigger if exists speaking_pron_goals_touch_updated on public.speaking_pron_goals;
create trigger speaking_pron_goals_touch_updated
  before update on public.speaking_pron_goals
  for each row
  execute function public.touch_updated_at();

alter table public.speaking_pron_goals enable row level security;

drop policy if exists "Users manage their pron goals" on public.speaking_pron_goals;
create policy "Users manage their pron goals"
  on public.speaking_pron_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reporting view (depends on attempts + exercises)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.v_speaking_latest as
select a.*, e.slug as exercise_slug
from public.speaking_attempts a
left join public.speaking_exercises e on e.id = a.exercise_id
where a.created_at > timezone('utc', now()) - interval '90 days';

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed curated exercises (idempotent upsert by slug)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.speaking_exercises (slug, level, type, prompt, ipa, target_wpm, tags)
values
  ('phoneme-th', 'B1', 'phoneme', 'Sustain the /θ/ sound for four seconds.', '/θ/', null, array['/θ/', 'articulation']),
  ('phoneme-dh', 'B1', 'phoneme', 'Alternate /ð/ and /d/ for clarity.', '/ð/', null, array['/ð/', 'voicing']),
  ('phoneme-r', 'B1', 'phoneme', 'Practice the /r/ glide with “river”.', '/r/', null, array['/r/', 'linking']),
  ('phoneme-l', 'B1', 'phoneme', 'Hold the light /l/ at the start of “light”.', '/l/', null, array['/l/', 'tongue']),
  ('phoneme-v', 'B1', 'phoneme', 'Buzz the /v/ sound with steady airflow.', '/v/', null, array['/v/', 'voicing']),
  ('phoneme-w', 'B1', 'phoneme', 'Round lips for the /w/ glide repeatedly.', '/w/', null, array['/w/', 'lip-rounding']),
  ('phoneme-ae', 'B1', 'phoneme', 'Contrast /æ/ in “cat” with /ʌ/ in “cup”.', '/æ/', null, array['/æ/', 'vowel']),
  ('phoneme-uh', 'B1', 'phoneme', 'Sustain the relaxed /ʌ/ vowel.', '/ʌ/', null, array['/ʌ/', 'vowel']),
  ('phoneme-ih', 'B1', 'phoneme', 'Clip the short /ɪ/ vowel quickly.', '/ɪ/', null, array['/ɪ/', 'vowel']),
  ('phoneme-ee', 'B1', 'phoneme', 'Stretch the long /iː/ vowel smoothly.', '/iː/', null, array['/iː/', 'vowel']),
  ('word-think', 'B1', 'word', 'Say “think” three times with clear /θ/.', 'θɪŋk', 90, array['/θ/', 'word-stress']),
  ('word-this', 'B1', 'word', 'Say “this” three times emphasising /ð/.', 'ðɪs', 95, array['/ð/', 'word-stress']),
  ('word-world', 'B2', 'word', 'Repeat “world” focusing on dark /l/.', 'wɜːld', 80, array['/l/', 'clusters']),
  ('sentence-weather', 'B1', 'sentence', '“The weather there was thrilling.”', 'ðə ˈwɛðə ðeə wəz ˈθrɪlɪŋ', 110, array['/ð/', '/θ/', 'intonation']),
  ('sentence-travel', 'B2', 'sentence', '“Traveling regularly helps relax me.”', 'ˈtrævəlɪŋ ˈrɛgjələli hɛlps rɪˈlæks miː', 120, array['/r/', 'rhythm']),
  ('sentence-science', 'B2', 'sentence', '“Science allows us to solve real issues.”', 'ˈsaɪəns əˈlaʊz ʌs tuː sɒlv ˈrɪəl ˈɪʃuːz', 115, array['/s/', '/z/', 'pace']),
  ('sentence-future', 'B2', 'sentence', '“In the future I will work abroad.”', 'ɪn ðə ˈfjuːtʃə aɪ wɪl wɜːk əˈbrɔːd', 115, array['/ð/', '/w/', 'intonation']),
  ('cuecard-healthy-food', 'B1', 'cue_card', 'Describe a healthy meal you enjoy cooking.', null, 140, array['topic:health', 'fluency']),
  ('cuecard-study-place', 'B1', 'cue_card', 'Talk about a place where you like to study.', null, 135, array['topic:study', 'fluency']),
  ('cuecard-important-event', 'B2', 'cue_card', 'Describe an important event from your childhood.', null, 145, array['topic:memory', 'storytelling']),
  ('cuecard-technology', 'B2', 'cue_card', 'Explain how technology helps you learn languages.', null, 150, array['topic:technology', 'fluency']),
  ('cuecard-travel', 'B2', 'cue_card', 'Talk about a memorable trip you took recently.', null, 145, array['topic:travel', 'narrative']),
  ('sentence-energy', 'C1', 'sentence', '“Innovative energy policies drive change.”', 'ˌɪnəˈveɪtɪv ˈɛnədʒi ˈpɒlɪsiz draɪv tʃeɪnʤ', 125, array['/v/', 'stress']),
  ('sentence-environment', 'C1', 'sentence', '“Environmental issues require bold action.”', 'ɪnˌvaɪərənˈmɛntl ˈɪʃuːz rɪˈkwaɪə bəʊld ˈækʃən', 125, array['/r/', 'intonation']),
  ('cuecard-community', 'C1', 'cue_card', 'Describe a community project you supported.', null, 150, array['topic:community', 'fluency'])
on conflict (slug) do update set
  level = excluded.level,
  type = excluded.type,
  prompt = excluded.prompt,
  ipa = excluded.ipa,
  target_wpm = excluded.target_wpm,
  tags = excluded.tags,
  updated_at = timezone('utc', now());
