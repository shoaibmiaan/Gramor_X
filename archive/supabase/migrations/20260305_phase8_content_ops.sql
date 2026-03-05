-- supabase/migrations/20260305_phase8_content_ops.sql
-- Phase 8 Content Ops: structured word drill packs for collocations, IELTS examples, and audio references.

create table if not exists public.word_packs (
  id uuid primary key default gen_random_uuid(),
  word_id uuid references public.words(id) on delete cascade,
  slug text not null,
  register text not null check (register in ('formal','neutral','informal')),
  audio_ref text,
  collocations text[] not null default '{}'::text[],
  examples jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint word_packs_word_slug unique (word_id, slug)
);

create index if not exists idx_word_packs_slug on public.word_packs (slug);

alter table public.word_packs enable row level security;

create policy if not exists "Word packs are public" on public.word_packs
  for select using (true);

create policy if not exists "Service manages word packs" on public.word_packs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_word_packs_updated on public.word_packs;
create trigger trg_word_packs_updated
before update on public.word_packs
for each row execute procedure public.set_updated_at();
