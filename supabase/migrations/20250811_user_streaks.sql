create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  last_activity_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_streaks enable row level security;

create policy "read own streak" on public.user_streaks
for select to authenticated
using (auth.uid() = user_id);

create policy "upsert own streak" on public.user_streaks
for insert with check (auth.uid() = user_id);

create policy "update own streak" on public.user_streaks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- trigger for updated_at (reuse function if already created)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_user_streaks_updated on public.user_streaks;
create trigger trg_user_streaks_updated
before update on public.user_streaks
for each row execute procedure public.set_updated_at();
