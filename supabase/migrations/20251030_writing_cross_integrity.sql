-- Writing cross-module lifts & integrity features

-- Extend writing_attempts with integrity flags for copy-paste alerts etc
alter table if exists public.writing_attempts
  add column if not exists integrity_flags jsonb not null default '{}'::jsonb;

-- Storage bucket for handwritten uploads (idempotent)
insert into storage.buckets (id, name, public)
values ('writing-originals', 'writing-originals', false)
on conflict (id) do update set public = excluded.public;

-- Table to store uploaded handwritten essays + OCR output
create table if not exists public.writing_originals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid references public.writing_attempts(id) on delete cascade,
  image_path text not null,
  ocr_text text,
  legibility numeric,
  created_at timestamptz not null default now()
);

create index if not exists writing_originals_user_idx
  on public.writing_originals (user_id, created_at desc);

create index if not exists writing_originals_attempt_idx
  on public.writing_originals (attempt_id);

alter table public.writing_originals enable row level security;

create policy if not exists "writing_originals_owner_manage" on public.writing_originals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "writing_originals_admin_read" on public.writing_originals
  for select
  using (auth.jwt()->>'role' in ('teacher','admin'));

alter table if exists public.writing_reviews
  add column if not exists audio_url text;

-- Weekly band reports (PDF blobs + metadata)
create table if not exists public.writing_band_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  summary jsonb not null default '{}'::jsonb,
  pdf bytea not null,
  channels text[] not null default '{}'::text[],
  download_token text not null default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists writing_band_reports_token_idx
  on public.writing_band_reports (download_token);

create index if not exists writing_band_reports_user_idx
  on public.writing_band_reports (user_id, created_at desc);

alter table public.writing_band_reports enable row level security;

create policy if not exists "writing_band_reports_owner_manage" on public.writing_band_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "writing_band_reports_admin_read" on public.writing_band_reports
  for select
  using (auth.jwt()->>'role' in ('teacher','admin'));
