-- Daily vocabulary + streak infrastructure
create extension if not exists "pgcrypto";

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  meaning text not null,
  example text,
  synonyms text[] default '{}'::text[],
  interest_hook text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists words_word_lower_idx on public.words (lower(word));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_words_updated on public.words;
create trigger trg_words_updated
before update on public.words
for each row execute procedure public.set_updated_at();

alter table public.words enable row level security;

do $$
begin
  create policy "words_public_read" on public.words
    for select using (true);
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "words_service_insert" on public.words
    for insert with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

do $$
begin
  create policy "words_service_update" on public.words
    for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end$$;

create table if not exists public.user_word_logs (
  user_id uuid references auth.users(id) on delete cascade,
  word_id uuid references public.words(id) on delete cascade,
  learned_on date not null,
  created_at timestamptz default now(),
  constraint user_word_logs_pkey primary key (user_id, learned_on)
);

create index if not exists user_word_logs_user_day_idx on public.user_word_logs(user_id, learned_on desc);
create index if not exists user_word_logs_word_idx on public.user_word_logs(word_id);

alter table public.user_word_logs enable row level security;

do $$
begin
  create policy "word_logs_own_rw" on public.user_word_logs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end$$;

create or replace function public.get_word_of_day(d date default timezone('Asia/Karachi', now())::date)
returns table (
  id uuid,
  word text,
  meaning text,
  example text,
  synonyms text[],
  interest_hook text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_day date := coalesce(d, timezone('Asia/Karachi', now())::date);
  total integer;
  offset integer;
  target integer;
begin
  select count(*) into total from public.words;
  if coalesce(total, 0) = 0 then
    return query
      select
        null::uuid,
        'persevere'::text,
        'continue in a course of action even in the face of difficulty'::text,
        'Persevere through practice to reach Band 8+.'::text,
        ARRAY['persist', 'endure']::text[],
        'Connect ''persevere'' with IELTS speaking by sharing persistence stories.'::text;
    return;
  end if;

  offset := mod((target_day - date '2020-01-01'), total);
  if offset < 0 then
    offset := offset + total;
  end if;
  target := offset + 1;

  return query
  with ordered as (
    select w.*, row_number() over (order by lower(w.word), w.id) as rn
    from public.words w
  )
  select o.id, o.word, o.meaning, o.example, coalesce(o.synonyms, '{}'::text[]), o.interest_hook
  from ordered o
  where o.rn = target;
end;
$$;

grant execute on function public.get_word_of_day(date) to anon, authenticated, service_role;

create or replace function public.calc_streak(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := timezone('Asia/Karachi', now())::date;
  last_learned date;
  streak integer := 0;
  expected date;
  entry record;
  existing_longest integer;
begin
  if p_user is null then
    return 0;
  end if;

  select longest into existing_longest from public.streaks where user_id = p_user;
  existing_longest := coalesce(existing_longest, 0);

  select max(learned_on) into last_learned
  from public.user_word_logs
  where user_id = p_user;

  if last_learned is null then
    insert into public.user_streaks (user_id, current_streak, last_activity_date)
    values (p_user, 0, null)
    on conflict (user_id) do update
      set current_streak = 0,
          last_activity_date = null;

    insert into public.streaks (user_id, current, longest, last_active_date, updated_at)
    values (p_user, 0, existing_longest, null, now())
    on conflict (user_id) do update
      set current = 0,
          longest = greatest(public.streaks.longest, existing_longest),
          last_active_date = null,
          updated_at = now();
    return 0;
  end if;

  if last_learned >= today then
    streak := 1;
  elsif last_learned = today - 1 then
    streak := 1;
  else
    streak := 0;
  end if;

  if streak > 0 then
    expected := last_learned - 1;
    for entry in
      select learned_on
      from public.user_word_logs
      where user_id = p_user and learned_on < last_learned
      order by learned_on desc
    loop
      if entry.learned_on = expected then
        streak := streak + 1;
        expected := expected - 1;
      elsif entry.learned_on = expected + 1 then
        continue;
      else
        exit;
      end if;
    end loop;
  end if;

  insert into public.user_streaks (user_id, current_streak, last_activity_date)
  values (p_user, streak, last_learned)
  on conflict (user_id) do update
    set current_streak = excluded.current_streak,
        last_activity_date = excluded.last_activity_date;

  insert into public.streaks (user_id, current, longest, last_active_date, updated_at)
  values (p_user, streak, greatest(streak, existing_longest), last_learned, now())
  on conflict (user_id) do update
    set current = excluded.current,
        longest = greatest(public.streaks.longest, excluded.current, existing_longest),
        last_active_date = excluded.last_active_date,
        updated_at = now();

  return streak;
end;
$$;

grant execute on function public.calc_streak(uuid) to authenticated, service_role;
