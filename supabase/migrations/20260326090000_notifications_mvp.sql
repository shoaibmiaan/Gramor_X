-- Notifications MVP schema
-- Enums ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

do $$
begin
  create type public.notification_channel as enum ('email', 'whatsapp');
exception when duplicate_object then null;
end$$;

do $$
begin
  create type public.delivery_status as enum ('pending', 'sent', 'failed', 'deferred');
exception when duplicate_object then null;
end$$;

-- Helper to maintain updated_at stamps --------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Preferences table ---------------------------------------------------------
alter table public.notifications_opt_in
  add column if not exists id uuid default uuid_generate_v4(),
  add column if not exists channels public.notification_channel[] not null default '{}'::public.notification_channel[],
  add column if not exists quiet_hours_start time without time zone,
  add column if not exists quiet_hours_end time without time zone,
  add column if not exists timezone text default 'UTC',
  add column if not exists created_at timestamptz not null default now();

update public.notifications_opt_in
set id = coalesce(id, uuid_generate_v4())
where id is null;

update public.notifications_opt_in
set created_at = coalesce(created_at, now());

update public.notifications_opt_in
set timezone = coalesce(timezone, 'UTC');

update public.notifications_opt_in
set channels = array_remove(array[
  case when coalesce(email_opt_in, true) then 'email'::public.notification_channel end,
  case when coalesce(wa_opt_in, false) then 'whatsapp'::public.notification_channel end
], null)::public.notification_channel[]
where coalesce(array_length(channels, 1), 0) = 0;

alter table public.notifications_opt_in
  alter column id set not null,
  alter column updated_at set default now();

create unique index if not exists notifications_opt_in_id_key
  on public.notifications_opt_in(id);

alter table public.notifications_opt_in enable row level security;

do $$
begin
  create policy "notifications_opt_in_rw"
    on public.notifications_opt_in
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end$$;

drop trigger if exists notifications_opt_in_set_updated_at on public.notifications_opt_in;
create trigger notifications_opt_in_set_updated_at
  before update on public.notifications_opt_in
  for each row execute procedure public.set_updated_at();

-- Templates -----------------------------------------------------------------
create table if not exists public.notification_templates (
  id uuid primary key default uuid_generate_v4(),
  template_key text not null,
  channel public.notification_channel not null,
  locale text not null default 'en',
  subject text,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_templates enable row level security;

drop policy if exists "notification_templates_select" on public.notification_templates;
create policy "notification_templates_select"
  on public.notification_templates
  for select
  using (true);

drop policy if exists "notification_templates_manage" on public.notification_templates;
create policy "notification_templates_manage"
  on public.notification_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists notification_templates_set_updated_at on public.notification_templates;
create trigger notification_templates_set_updated_at
  before update on public.notification_templates
  for each row execute procedure public.set_updated_at();

create unique index if not exists notification_templates_unique
  on public.notification_templates (template_key, channel, locale);

-- Events --------------------------------------------------------------------
create table if not exists public.notification_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  locale text not null default 'en',
  payload jsonb not null default '{}'::jsonb,
  requested_channels public.notification_channel[] not null default '{}'::public.notification_channel[],
  idempotency_key text,
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_events enable row level security;

create unique index if not exists notification_events_idempotency_idx
  on public.notification_events (idempotency_key)
  where idempotency_key is not null;

do $$
begin
  create policy "notification_events_read_own"
    on public.notification_events
    for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end$$;

drop policy if exists "notification_events_manage" on public.notification_events;
create policy "notification_events_manage"
  on public.notification_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists notification_events_set_updated_at on public.notification_events;
create trigger notification_events_set_updated_at
  before update on public.notification_events
  for each row execute procedure public.set_updated_at();

-- Deliveries ----------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  template_id uuid references public.notification_templates(id),
  channel public.notification_channel not null,
  status public.delivery_status not null default 'pending',
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_deliveries enable row level security;

create unique index if not exists notification_deliveries_event_channel_idx
  on public.notification_deliveries (event_id, channel);

create index if not exists notification_deliveries_status_next_retry_idx
  on public.notification_deliveries (status, next_retry_at);

do $$
begin
  create policy "notification_deliveries_read_own"
    on public.notification_deliveries
    for select
    using (
      exists (
        select 1
        from public.notification_events e
        where e.id = event_id and e.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end$$;

drop policy if exists "notification_deliveries_manage" on public.notification_deliveries;
create policy "notification_deliveries_manage"
  on public.notification_deliveries
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists notification_deliveries_set_updated_at on public.notification_deliveries;
create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute procedure public.set_updated_at();

-- Schedules -----------------------------------------------------------------
create table if not exists public.notification_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  channel public.notification_channel not null,
  schedule jsonb not null default '{}'::jsonb,
  timezone text default 'UTC',
  next_run_at timestamptz,
  last_run_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_schedules enable row level security;

create unique index if not exists notification_schedules_unique
  on public.notification_schedules (user_id, event_key, channel);

do $$
begin
  create policy "notification_schedules_manage"
    on public.notification_schedules
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end$$;

drop trigger if exists notification_schedules_set_updated_at on public.notification_schedules;
create trigger notification_schedules_set_updated_at
  before update on public.notification_schedules
  for each row execute procedure public.set_updated_at();

-- Seed default templates ----------------------------------------------------
insert into public.notification_templates (template_key, channel, locale, subject, body)
values
  (
    'study_reminder',
    'email',
    'en',
    'Time to study {{module}}',
    'Hi {{first_name}},\n\nYour study reminder for {{module}} is ready. Jump back in: {{deep_link}}.\n\nKeep going — you''re doing great!'
  ),
  (
    'study_reminder',
    'whatsapp',
    'en',
    null,
    'Hi {{first_name}}! Ready for today''s {{module}} session? Tap {{deep_link}} to pick up where you left off.'
  ),
  (
    'score_ready',
    'email',
    'en',
    'Your {{module}} score is ready',
    'Great news {{first_name}}!\n\nYour {{module}} score is ready. View it here: {{deep_link}}.\n\nNeed help interpreting the result? We''ve got tips waiting for you.'
  )
on conflict (template_key, channel, locale) do update
set subject = excluded.subject,
    body = excluded.body,
    updated_at = now();
