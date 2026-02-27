-- push tokens + audit log
create table if not exists public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('web','ios','android')),
  topics text[] not null default '{"general"}',
  subscription jsonb,
  metadata jsonb default '{}'::jsonb,
  device_id text,
  last_seen_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint push_tokens_token_unique unique (token)
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
create index if not exists push_tokens_platform_idx on public.push_tokens(platform);
create index if not exists push_tokens_topics_idx on public.push_tokens using gin(topics);

create trigger trg_push_tokens_updated
before update on public.push_tokens
for each row execute procedure public.set_updated_at();

alter table public.push_tokens enable row level security;

create policy "users manage own push tokens"
on public.push_tokens
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.mobile_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_id uuid references public.push_tokens(id) on delete set null,
  event_type text not null,
  topic text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists mobile_events_user_idx on public.mobile_events(user_id, created_at desc);
create index if not exists mobile_events_event_type_idx on public.mobile_events(event_type);

alter table public.mobile_events enable row level security;

create policy "users read own mobile events"
on public.mobile_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "users write own mobile events"
on public.mobile_events
for insert
to authenticated
with check (auth.uid() = user_id);

