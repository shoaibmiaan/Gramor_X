-- Daily totals across all users
create or replace view public.v_ai_vocab_rewrite_usage_by_date as
select
  (created_at at time zone 'utc')::date as day,
  count(*)::int as total_rewrites
from public.ai_vocab_rewrites
group by day
order by day desc;
