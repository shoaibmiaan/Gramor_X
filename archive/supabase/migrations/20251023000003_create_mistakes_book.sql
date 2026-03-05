-- 20251023_create_mistakes_book.sql
-- Personalised mistakes book sourced from AI writing feedback.

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'writing' check (source = 'writing'),
  attempt_id uuid references public.exam_attempts(id) on delete set null,
  type text not null,
  excerpt text not null,
  excerpt_hash text not null,
  ai_tip text,
  status text not null default 'new' check (status in ('new','reviewing','resolved')),
  created_at timestamptz not null default now()
);

create unique index if not exists mistakes_unique_excerpt on public.mistakes(attempt_id, type, excerpt_hash);
create index if not exists mistakes_user_idx on public.mistakes(user_id, status, created_at desc);

alter table if exists public.mistakes enable row level security;

do $$ begin
  create policy mistakes_owner_rw on public.mistakes
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy mistakes_staff_full on public.mistakes
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

comment on table public.mistakes is 'AI-synced mistakes to review and resolve across study plan focus areas.';
