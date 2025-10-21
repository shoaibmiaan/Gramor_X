# Word of the Day Data Access

The Word of the Day experience is powered by the `daily_words` schedule and the
`vocab_words` catalogue. Application services should use the hardened view and
RPC below to retrieve the surfaced word in a predictable shape.

## View: `public.word_of_day_v`

The view joins `daily_words` to `vocab_words`, exposing one row per `word_date`
with the full vocabulary metadata. Selecting from the view is the quickest way
for analytics or admin tooling to inspect the upcoming rotation.

```sql
select word_date, id as vocab_word_id, headword
from public.word_of_day_v
order by word_date desc
limit 5;
```

Permissions: `anon` and `authenticated` roles receive read access so both SSR
and browser clients can hydrate the daily word without bespoke policies.

## Function: `public.get_word_of_day_v2(date)`

`get_word_of_day_v2` wraps the view and always returns **zero or one row**. When
no schedule exists for the requested day the function yields an empty result,
allowing callers to respond with a 404.

```sql
-- Returns exactly one row for the provided Asia/Karachi date (or none)
select *
from public.get_word_of_day_v2('2025-03-15'::date);
```

The function defaults to the current Asia/Karachi date when no argument is
provided and is granted to the `anon` and `authenticated` roles so that edge
handlers and client components can call it directly.
