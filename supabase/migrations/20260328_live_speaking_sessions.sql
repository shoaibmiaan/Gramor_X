-- 20260328_live_speaking_sessions.sql
-- Schema for live speaking sessions and associated recordings.

create table if not exists public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  participant_user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('human','ai','peer')),
  status text not null check (status in ('pending','active','completed','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists speaking_sessions_host_status_idx
  on public.speaking_sessions (host_user_id, status);
create index if not exists speaking_sessions_participant_idx
  on public.speaking_sessions (participant_user_id);
create index if not exists speaking_sessions_scheduled_at_idx
  on public.speaking_sessions (scheduled_at);

alter table public.speaking_sessions enable row level security;

drop policy if exists "Participants manage speaking sessions" on public.speaking_sessions;
create policy "Participants manage speaking sessions"
  on public.speaking_sessions
  for select
  using (
    auth.uid() = host_user_id
    or auth.uid() = participant_user_id
    or auth.jwt()->>'role' in ('teacher','admin')
  );

drop policy if exists "Hosts insert speaking sessions" on public.speaking_sessions;
create policy "Hosts insert speaking sessions"
  on public.speaking_sessions
  for insert
  with check (
    auth.uid() = host_user_id
    or auth.jwt()->>'role' in ('teacher','admin')
  );

drop policy if exists "Participants update speaking sessions" on public.speaking_sessions;
create policy "Participants update speaking sessions"
  on public.speaking_sessions
  for update
  using (
    auth.uid() = host_user_id
    or auth.uid() = participant_user_id
    or auth.jwt()->>'role' in ('teacher','admin')
  )
  with check (
    auth.uid() = host_user_id
    or auth.uid() = participant_user_id
    or auth.jwt()->>'role' in ('teacher','admin')
  );

drop policy if exists "Staff delete speaking sessions" on public.speaking_sessions;
create policy "Staff delete speaking sessions"
  on public.speaking_sessions
  for delete
  using (auth.jwt()->>'role' in ('teacher','admin'));

create trigger speaking_sessions_touch_updated
  before update on public.speaking_sessions
  for each row
  execute procedure public.touch_updated_at();

create table if not exists public.session_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.speaking_sessions(id) on delete cascade,
  storage_path text not null,
  transcript_path text,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists session_recordings_session_idx
  on public.session_recordings (session_id, created_at desc);

alter table public.session_recordings enable row level security;

drop policy if exists "Participants read session recordings" on public.session_recordings;
create policy "Participants read session recordings"
  on public.session_recordings
  for select
  using (
    exists (
      select 1 from public.speaking_sessions s
      where s.id = session_recordings.session_id
        and (
          auth.uid() = s.host_user_id
          or auth.uid() = s.participant_user_id
          or auth.jwt()->>'role' in ('teacher','admin')
        )
    )
  );

drop policy if exists "Participants insert session recordings" on public.session_recordings;
create policy "Participants insert session recordings"
  on public.session_recordings
  for insert
  with check (
    exists (
      select 1 from public.speaking_sessions s
      where s.id = session_recordings.session_id
        and (
          auth.uid() = s.host_user_id
          or auth.uid() = s.participant_user_id
          or auth.jwt()->>'role' in ('teacher','admin')
        )
    )
  );

drop policy if exists "Participants update session recordings" on public.session_recordings;
create policy "Participants update session recordings"
  on public.session_recordings
  for update
  using (
    exists (
      select 1 from public.speaking_sessions s
      where s.id = session_recordings.session_id
        and (
          auth.uid() = s.host_user_id
          or auth.uid() = s.participant_user_id
          or auth.jwt()->>'role' in ('teacher','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.speaking_sessions s
      where s.id = session_recordings.session_id
        and (
          auth.uid() = s.host_user_id
          or auth.uid() = s.participant_user_id
          or auth.jwt()->>'role' in ('teacher','admin')
        )
    )
  );

drop policy if exists "Staff delete session recordings" on public.session_recordings;
create policy "Staff delete session recordings"
  on public.session_recordings
  for delete
  using (
    auth.jwt()->>'role' in ('teacher','admin')
  );
