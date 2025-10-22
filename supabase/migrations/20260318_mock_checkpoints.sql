create table if not exists mock_checkpoints (
  id bigserial primary key,
  attempt_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  section_idx smallint not null,
  mock_id text,
  snapshot jsonb not null,
  elapsed_sec integer default 0,
  duration_sec integer,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists mock_checkpoints_attempt_idx
  on mock_checkpoints (attempt_id);

create index if not exists mock_checkpoints_user_idx
  on mock_checkpoints (user_id, section_idx, created_at desc);

alter table mock_checkpoints enable row level security;

create policy "Users insert mock checkpoints" on mock_checkpoints
  for insert with check (auth.uid() = user_id);

create policy "Users select mock checkpoints" on mock_checkpoints
  for select using (auth.uid() = user_id);
