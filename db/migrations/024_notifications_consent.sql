-- Notifications consent audit trail and phone verification helpers
alter table public.profiles
  add column if not exists phone_verified boolean default false;

create table if not exists public.notification_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  channel text not null check (channel in ('email','sms','whatsapp')),
  action text not null check (action in ('opt_in','opt_out','verify','test_message','task')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.notification_consent_events enable row level security;

do $$ begin
  create policy "consent_owner_select" on public.notification_consent_events
    for select
    using (auth.uid() = user_id or auth.uid() = actor_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "consent_owner_insert" on public.notification_consent_events
    for insert
    with check (auth.uid() = coalesce(actor_id, user_id));
exception when duplicate_object then null; end $$;

create index if not exists idx_notification_consent_user_channel
  on public.notification_consent_events(user_id, channel, created_at desc);
