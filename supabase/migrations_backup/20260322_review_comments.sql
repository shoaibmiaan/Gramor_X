-- 20260322_review_comments.sql
-- Review comment threads attached to exam attempts with RLS policies.

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  parent_id uuid references public.review_comments(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  author_role text,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_comments_attempt_idx
  on public.review_comments(attempt_id, created_at asc);

create index if not exists review_comments_parent_idx
  on public.review_comments(parent_id);

create trigger if not exists review_comments_set_updated
  before update on public.review_comments
  for each row execute procedure public.set_updated_at();

alter table if exists public.review_comments enable row level security;

-- Owners (students) can manage their attempt comments
DO $$
BEGIN
  create policy review_comments_owner_rw on public.review_comments
    for all
    using (
      exists (
        select 1 from public.exam_attempts ea
        where ea.id = review_comments.attempt_id
          and ea.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.exam_attempts ea
        where ea.id = review_comments.attempt_id
          and ea.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Teaching staff have full access
DO $$
BEGIN
  create policy review_comments_staff_full on public.review_comments
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher', 'admin'))
    with check (auth.jwt()->>'role' in ('teacher', 'admin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

comment on table public.review_comments is 'Threaded reviewer comments tied to exam attempts.';
comment on column public.review_comments.parent_id is 'Self-referential pointer for threaded replies.';
comment on column public.review_comments.author_role is 'Free-text role label used for display (e.g., teacher, peer).';
