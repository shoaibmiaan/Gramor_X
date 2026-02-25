-- Issue 3: Harden word of the day selection
-- Create a canonical view that exposes the scheduled word metadata
-- and ensure the RPC only yields a single row for the requested date.

create or replace view public.word_of_day_v as
select
  dw.word_date,
  vw.*
from public.daily_words dw
join public.vocab_words vw
  on vw.id = dw.vocab_word_id;

create or replace function public.get_word_of_day_v2(p_date date default timezone('Asia/Karachi', now())::date)
returns setof public.word_of_day_v
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.word_of_day_v
  where word_date = coalesce(p_date, timezone('Asia/Karachi', now())::date)
  order by word_date desc, id
  limit 1;
$$;

grant select on public.word_of_day_v to anon, authenticated;
grant execute on function public.get_word_of_day_v2(date) to anon, authenticated;
