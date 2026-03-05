-- 20260401_speaking_prompt_library.sql
-- Schema for IELTS speaking prompt library, packs, and user saves.

create table if not exists public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  part text not null check (part in ('p1','p2','p3','interview','scenario')),
  topic text not null,
  cue_card text,
  question text,
  followups text[] not null default '{}',
  difficulty text not null check (difficulty in ('B1','B2','C1','C2')),
  locale text not null default 'en',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists speaking_prompts_part_idx
  on public.speaking_prompts (part, difficulty);
create index if not exists speaking_prompts_topic_idx
  on public.speaking_prompts (topic);
create index if not exists speaking_prompts_tags_idx
  on public.speaking_prompts using gin (tags);

create trigger speaking_prompts_touch_updated
  before update on public.speaking_prompts
  for each row
  execute procedure public.touch_updated_at();

alter table public.speaking_prompts enable row level security;

drop policy if exists "Public speaking prompts" on public.speaking_prompts;
create policy "Public speaking prompts"
  on public.speaking_prompts
  for select
  using (is_active is true);

drop policy if exists "Staff manage speaking prompts" on public.speaking_prompts;
create policy "Staff manage speaking prompts"
  on public.speaking_prompts
  for all
  using (auth.jwt()->>'role' in ('admin','teacher'))
  with check (auth.jwt()->>'role' in ('admin','teacher'));

-- Prompt packs ----------------------------------------------------------------

create table if not exists public.speaking_prompt_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  visibility text not null default 'public' check (visibility in ('public','cohort','private')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger speaking_prompt_packs_touch_updated
  before update on public.speaking_prompt_packs
  for each row
  execute procedure public.touch_updated_at();

alter table public.speaking_prompt_packs enable row level security;

drop policy if exists "Public prompt packs" on public.speaking_prompt_packs;
create policy "Public prompt packs"
  on public.speaking_prompt_packs
  for select
  using (
    is_active
    and (
      visibility = 'public'
      or auth.jwt()->>'role' in ('admin','teacher')
    )
  );

drop policy if exists "Staff manage prompt packs" on public.speaking_prompt_packs;
create policy "Staff manage prompt packs"
  on public.speaking_prompt_packs
  for all
  using (auth.jwt()->>'role' in ('admin','teacher'))
  with check (auth.jwt()->>'role' in ('admin','teacher'));

-- Pack membership -------------------------------------------------------------

create table if not exists public.speaking_prompt_pack_items (
  pack_id uuid not null references public.speaking_prompt_packs(id) on delete cascade,
  prompt_id uuid not null references public.speaking_prompts(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (pack_id, prompt_id)
);

create index if not exists speaking_prompt_pack_items_pack_idx
  on public.speaking_prompt_pack_items (pack_id, sort_order);

alter table public.speaking_prompt_pack_items enable row level security;

drop policy if exists "Pack items visible with pack" on public.speaking_prompt_pack_items;
create policy "Pack items visible with pack"
  on public.speaking_prompt_pack_items
  for select
  using (
    exists (
      select 1 from public.speaking_prompt_packs p
      where p.id = speaking_prompt_pack_items.pack_id
        and p.is_active
        and (
          p.visibility = 'public'
          or auth.jwt()->>'role' in ('admin','teacher')
        )
    )
  );

drop policy if exists "Staff manage pack items" on public.speaking_prompt_pack_items;
create policy "Staff manage pack items"
  on public.speaking_prompt_pack_items
  for all
  using (auth.jwt()->>'role' in ('admin','teacher'))
  with check (auth.jwt()->>'role' in ('admin','teacher'));

-- User saves ------------------------------------------------------------------

create table if not exists public.speaking_prompt_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references public.speaking_prompts(id) on delete cascade,
  is_bookmarked boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, prompt_id)
);

create index if not exists speaking_prompt_saves_prompt_idx
  on public.speaking_prompt_saves (prompt_id);

create trigger speaking_prompt_saves_touch_updated
  before update on public.speaking_prompt_saves
  for each row
  execute procedure public.touch_updated_at();

alter table public.speaking_prompt_saves enable row level security;

drop policy if exists "Users manage prompt saves" on public.speaking_prompt_saves;
create policy "Users manage prompt saves"
  on public.speaking_prompt_saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
