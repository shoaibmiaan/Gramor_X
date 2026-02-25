-- Align the public.profiles table with the fields used by the revamped profile setup flow.
-- Ensure every column referenced in the UI exists with sensible defaults and constraints.

alter table public.profiles
  add column if not exists country text,
  add column if not exists english_level text check (english_level in (
    'Beginner',
    'Elementary',
    'Pre-Intermediate',
    'Intermediate',
    'Upper-Intermediate',
    'Advanced'
  )),
  add column if not exists goal_band numeric(2,1),
  add column if not exists exam_date date,
  add column if not exists study_prefs text[] default '{}'::text[],
  add column if not exists time_commitment text check (time_commitment in ('1h/day','2h/day','Flexible')),
  add column if not exists time_commitment_min integer,
  add column if not exists days_per_week smallint check (days_per_week between 1 and 7),
  add column if not exists preferred_language text default 'en',
  add column if not exists language_preference text default 'en',
  add column if not exists avatar_url text,
  add column if not exists goal_reason text[] default '{}'::text[],
  add column if not exists learning_style text,
  add column if not exists ai_recommendation jsonb default '{}'::jsonb,
  add column if not exists setup_complete boolean default false,
  add column if not exists status text default 'inactive',
  add column if not exists role text default 'student',
  add column if not exists timezone text,
  add column if not exists weaknesses text[] default '{}'::text[],
  add column if not exists focus_topics text[] default '{}'::text[],
  add column if not exists daily_quota_goal integer,
  add column if not exists study_days text[] default '{}'::text[],
  add column if not exists study_minutes_per_day integer,
  add column if not exists phone text;

-- Ensure boolean/array defaults are applied to any existing rows so the UI can rely on them.
update public.profiles
  set
    study_prefs = coalesce(study_prefs, '{}'::text[]),
    goal_reason = coalesce(goal_reason, '{}'::text[]),
    weaknesses = coalesce(weaknesses, '{}'::text[]),
    focus_topics = coalesce(focus_topics, '{}'::text[]),
    preferred_language = coalesce(preferred_language, 'en'),
    language_preference = coalesce(language_preference, preferred_language, 'en'),
    ai_recommendation = coalesce(ai_recommendation, '{}'::jsonb),
    setup_complete = coalesce(setup_complete, false),
    status = coalesce(status, 'inactive'),
    role = coalesce(role, 'student');
