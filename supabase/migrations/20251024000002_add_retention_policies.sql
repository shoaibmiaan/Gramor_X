alter table if exists writing_responses
  add column if not exists deleted_at timestamptz,
  add column if not exists retention_window interval default interval '365 days';

alter table if exists exam_events
  add column if not exists redacted boolean not null default false;

create index if not exists writing_responses_retention_idx on writing_responses (deleted_at, updated_at);
