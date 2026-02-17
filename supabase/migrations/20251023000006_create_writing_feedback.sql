-- 20251023_create_writing_feedback.sql
-- Stores enhanced AI feedback for writing responses including band 9 rewrites
-- and granular error highlights used in the review UI.

create table if not exists public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.writing_responses(id) on delete cascade,
  band9_rewrite text,
  errors jsonb not null default '[]'::jsonb,
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists writing_feedback_attempt_unique on public.writing_feedback(attempt_id);
create index if not exists writing_feedback_attempt_idx on public.writing_feedback(attempt_id);
create index if not exists writing_feedback_created_idx on public.writing_feedback(created_at desc);

alter table if exists public.writing_feedback enable row level security;

do $$ begin
  create policy writing_feedback_owner_rw on public.writing_feedback
    for all
    using (
      exists (
        select 1
        from public.writing_responses wr
        where wr.id = writing_feedback.attempt_id
          and wr.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.writing_responses wr
        where wr.id = writing_feedback.attempt_id
          and wr.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy writing_feedback_staff_full on public.writing_feedback
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

comment on table public.writing_feedback is 'Enhanced AI feedback for writing responses (band 9 rewrite, highlights, study focus).';
comment on column public.writing_feedback.errors is 'Structured array of error spans rendered in the review UI.';
comment on column public.writing_feedback.blocks is 'Focus areas that sync into the personalised study plan.';
