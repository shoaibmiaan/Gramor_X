-- Ensure notification_channels JSONB default
alter table public.profiles
  add column if not exists notification_channels jsonb;

alter table public.profiles
  add column if not exists whatsapp_opt_in boolean default false;

alter table public.profiles
  alter column notification_channels set default '[]'::jsonb;

update public.profiles
set notification_channels = case
  when notification_channels is null then '[]'::jsonb
  when jsonb_typeof(notification_channels) = 'array' then notification_channels
  else to_jsonb(notification_channels)
end;

-- guarantee in_app present
update public.profiles
set notification_channels = (
  select coalesce(jsonb_agg(distinct value), '[]'::jsonb)
  from jsonb_array_elements_text(
    case
      when notification_channels is null then '[]'::jsonb
      else notification_channels
    end || '[]'::jsonb
  )
  where value is not null and value <> ''
)
where notification_channels is not null;

-- append in_app if missing
update public.profiles
set notification_channels = coalesce(notification_channels, '[]'::jsonb) || '"in_app"'::jsonb
where notification_channels is null
   or not exists (
     select 1 from jsonb_array_elements_text(notification_channels) as elem(value)
     where value = 'in_app'
   );

alter table public.profiles
  alter column notification_channels set default '["in_app"]'::jsonb;

-- Notification events table
create table if not exists public.writing_notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid references public.writing_attempts(id) on delete set null,
  channel text not null check (channel in ('in_app','whatsapp','email')),
  type text not null check (type in ('micro_prompt','retake_reminder')),
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_writing_notification_events_user on public.writing_notification_events(user_id, created_at desc);
create index if not exists idx_writing_notification_events_type on public.writing_notification_events(type, created_at desc);

alter table public.writing_notification_events enable row level security;

create policy if not exists writing_notification_events_select_own on public.writing_notification_events
  for select using (auth.uid() = user_id);

create policy if not exists writing_notification_events_insert_own on public.writing_notification_events
  for insert with check (auth.uid() = user_id);

create policy if not exists writing_notification_events_staff_all on public.writing_notification_events
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.settings->>'role' in ('teacher','admin')
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.settings->>'role' in ('teacher','admin')
    )
  );

