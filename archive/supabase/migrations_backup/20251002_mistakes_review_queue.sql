-- supabase/migrations/20251002_mistakes_review_queue.sql
-- Enhancements for mistakes book MVP: persistence metadata + resolution tracking + view for review queue.

-- Add optional columns for retry paths and ensure created_at lookups are fast.
alter table public.mistakes_book
  add column if not exists retry_path text,
  add column if not exists last_seen_at timestamptz;

update public.mistakes_book
set last_seen_at = coalesce(last_seen_at, created_at)
where last_seen_at is null;

create index if not exists idx_mistakes_book_user_created
  on public.mistakes_book (user_id, created_at desc);

-- Resolution table keeps track of items the learner dismissed from the queue.
create table if not exists public.mistake_resolutions (
  user_id uuid not null references auth.users(id) on delete cascade,
  mistake_id uuid not null references public.mistakes_book(id) on delete cascade,
  resolved_at timestamptz not null default now(),
  primary key (user_id, mistake_id)
);

create index if not exists idx_mistake_resolutions_user
  on public.mistake_resolutions (user_id, resolved_at desc);

-- Expose a view that joins the base table with resolution metadata for easy querying.
create or replace view public.mistake_review_queue as
select
  m.id,
  m.user_id,
  m.mistake,
  m.correction,
  coalesce(nullif(m.type, ''), 'general') as type,
  coalesce(m.repetitions, 0) as repetitions,
  m.next_review,
  m.retry_path,
  coalesce(m.last_seen_at, m.created_at) as last_seen_at,
  m.created_at,
  r.resolved_at
from public.mistakes_book m
left join public.mistake_resolutions r
  on r.mistake_id = m.id and r.user_id = m.user_id;

comment on view public.mistake_review_queue is
  'Mistakes needing review with resolution metadata. Filter resolved_at IS NULL for active queue.';
