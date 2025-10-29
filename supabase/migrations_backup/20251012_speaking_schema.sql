-- 20251012_speaking_schema.sql
-- Ensure schema support for speaking prompts, attempts, and AI scoring responses.

-- -----------------------------------------------------------------------------
-- Storage bucket for speaking audio (private, upload via signed URLs)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('speaking-audio', 'speaking-audio', false)
on conflict (id) do update set public = excluded.public;

-- Allow authenticated users to manage objects within their own folder.
-- Folder pattern: <user_id>/<attempt_id>/...
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'speaking-audio user read own'
  ) then
    create policy "speaking-audio user read own"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'speaking-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'speaking-audio user upload own'
  ) then
    create policy "speaking-audio user upload own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'speaking-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'speaking-audio user update own'
  ) then
    create policy "speaking-audio user update own"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'speaking-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'speaking-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'speaking-audio user delete own'
  ) then
    create policy "speaking-audio user delete own"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'speaking-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Speaking prompts master table
-- -----------------------------------------------------------------------------
create table if not exists public.speaking_prompts (
  id uuid primary key default uuid_generate_v4(),
  part text not null check (part in ('part1', 'part2', 'part3')),
  prompt_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists speaking_prompts_set_updated_at on public.speaking_prompts;
create trigger speaking_prompts_set_updated_at
  before update on public.speaking_prompts
  for each row execute procedure public.set_updated_at();

alter table if exists public.speaking_prompts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'speaking_prompts'
      and policyname = 'speaking_prompts read'
  ) then
    create policy "speaking_prompts read"
      on public.speaking_prompts
      for select
      to authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'speaking_prompts'
      and policyname = 'speaking_prompts manage admin'
  ) then
    create policy "speaking_prompts manage admin"
      on public.speaking_prompts
      for all
      using (auth.jwt()->>'role' = 'admin')
      with check (auth.jwt()->>'role' = 'admin');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Ensure speaking_attempts has prompt linkage + audio metadata
-- -----------------------------------------------------------------------------
create table if not exists public.speaking_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid references public.speaking_prompts (id) on delete set null,
  mode text,
  part text,
  status text not null default 'pending',
  audio_object_path text,
  audio_urls jsonb not null default '{}'::jsonb,
  transcript text,
  band_overall numeric,
  band_breakdown jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists speaking_attempts_set_updated_at on public.speaking_attempts;
create trigger speaking_attempts_set_updated_at
  before update on public.speaking_attempts
  for each row execute procedure public.set_updated_at();

alter table public.speaking_attempts
  add column if not exists prompt_id uuid references public.speaking_prompts (id) on delete set null;

alter table public.speaking_attempts
  add column if not exists status text not null default 'pending';

alter table public.speaking_attempts
  add column if not exists audio_object_path text;

alter table public.speaking_attempts
  add column if not exists audio_urls jsonb not null default '{}'::jsonb;

create index if not exists speaking_attempts_prompt_id_idx
  on public.speaking_attempts (prompt_id);

create index if not exists speaking_attempts_user_id_idx
  on public.speaking_attempts (user_id);

-- -----------------------------------------------------------------------------
-- Speaking responses table (stores AI and human feedback per attempt)
-- -----------------------------------------------------------------------------
create table if not exists public.speaking_responses (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.speaking_attempts (id) on delete cascade,
  evaluator text not null default 'ai',
  overall numeric,
  fluency numeric,
  lexical numeric,
  grammar numeric,
  pronunciation numeric,
  feedback text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists speaking_responses_set_updated_at on public.speaking_responses;
create trigger speaking_responses_set_updated_at
  before update on public.speaking_responses
  for each row execute procedure public.set_updated_at();

alter table if exists public.speaking_responses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'speaking_responses'
      and policyname = 'speaking_responses user access own'
  ) then
    create policy "speaking_responses user access own"
      on public.speaking_responses
      for select
      using (
        exists (
          select 1
          from public.speaking_attempts sa
          where sa.id = attempt_id
            and sa.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'speaking_responses'
      and policyname = 'speaking_responses admin manage'
  ) then
    create policy "speaking_responses admin manage"
      on public.speaking_responses
      for all
      using (auth.jwt()->>'role' = 'admin')
      with check (auth.jwt()->>'role' = 'admin');
  end if;
end $$;
