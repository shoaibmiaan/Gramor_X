-- Issue 2: Pre-seed upcoming 30 days of daily words from active vocabulary catalog
-- Ensures the next month of dates is populated without overwriting existing rows.
with base_config as (
  select
    timezone('Asia/Karachi', now())::date as today,
    30 as target_days
),
config as (
  select
    today,
    target_days,
    today + (target_days - 1) as horizon
  from base_config
),
candidate_dates as (
  select (c.today + gs)::date as word_date
  from config c
  cross join generate_series(0, c.target_days - 1) as gs
),
missing_dates as (
  select
    cd.word_date,
    row_number() over (order by cd.word_date) as slot
  from candidate_dates cd
  where not exists (
    select 1
    from public.daily_words dw
    where dw.word_date = cd.word_date
  )
),
available_candidates as (
  select
    vw.id,
    c.horizon,
    max(case when dw.word_date >= c.today then dw.word_date end) as next_scheduled,
    max(case when dw.word_date < c.today then dw.word_date end) as last_scheduled
  from public.vocab_words vw
  cross join config c
  left join public.daily_words dw
    on dw.vocab_word_id = vw.id
  where vw.is_active is true
  group by vw.id, c.horizon
),
available as (
  select
    ac.id,
    row_number() over (
      order by
        case
          when ac.next_scheduled is null then 0
          when ac.next_scheduled > ac.horizon then 1
          else 2
        end,
        ac.last_scheduled nulls first,
        ac.next_scheduled nulls first,
        ac.id
    ) as slot
  from available_candidates ac
),
limited_available as (
  select a.id, a.slot
  from available a
  join config c on a.slot <= c.target_days
)
insert into public.daily_words (word_date, vocab_word_id)
select n.word_date, la.id
from missing_dates n
join limited_available la on la.slot = n.slot
on conflict (word_date) do nothing;
