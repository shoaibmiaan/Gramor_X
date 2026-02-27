alter table if exists exam_events
  add column if not exists payload jsonb,
  add column if not exists occurred_at timestamptz;

update exam_events
set occurred_at = coalesce(occurred_at, created_at)
where occurred_at is null;

alter table if exists exam_events
  alter column occurred_at set default now();
