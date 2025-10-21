# Vocabulary Ritual Analytics

This guide documents the analytics signals emitted by the Word of the Day / vocabulary ritual
experience. Use it as the companion for dashboard QA and KPI reviews.

## Event catalogue

| Event name                 | When it fires                                                                        | Payload snapshot                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `vocab_word_viewed`        | Learner lands on `/vocab` and the word of the day renders (RPC or cached view).      | `{ word_id, source }`                                                                          |
| `vocab_meaning_submitted`  | `/api/vocab/attempt/meaning` completes. Fires even when XP is `0` (tracks attempts). | `{ word_id, correct, xp_awarded, xp_requested, multiplier, capped, time_ms, day_iso }`         |
| `vocab_sentence_submitted` | Sentence attempt finished and AI feedback returned.                                  | `{ word_id, score, xp_awarded, xp_requested, multiplier, capped, time_ms, day_iso }`           |
| `vocab_synonyms_submitted` | Synonym rush results recorded.                                                       | `{ word_id, score, accuracy, xp_awarded, xp_requested, multiplier, capped, time_ms, day_iso }` |
| `vocab_reward_shown`       | Rewards panel becomes visible with non-zero XP. De-duplicated per session.           | `{ xp_total }`                                                                                 |
| `vocab_share_clicked`      | Learner taps the “Share progress” button (web share, clipboard, or fallback).        | `{ method, status }`                                                                           |

All server events are logged via `trackor.log`, so they automatically respect permission checks and
are available to the Supabase and BigQuery sinks.

## Dashboard metrics

`lib/analytics/success-metrics.ts` now summarises vocabulary engagement:

- **Active learners today**: unique users who logged a `wordsLearned` entry for the current day.
- **Meaning correct rate**: pass ratio derived from `xp_events.meta.kind === 'meaning'`.
- **Sentence & synonym scores**: averages pulled from XP event metadata.
- **XP awarded today**: total XP in `xp_events` scoped to the Asia/Karachi learning day.

These values surface in the weekly success metrics snapshot consumed by the growth dashboard. Keep an
eye on the guardrail thresholds when releasing changes to scoring or XP caps.

## Data sources

- **`xp_events`** &mdash; canonical log for awarded XP. Vocabulary APIs call `awardVocabXp`, which
  enforces the 60 XP daily cap and attaches granular metadata for analysis.
- **`user_word_logs` / `user_word_stats`** &mdash; track completion state and streak progression used by
  the streak widget. They are updated by the meaning, sentence, and synonym APIs.

## Test coverage

- `tests/lib/gamification.xp.test.ts` &mdash; validates XP rules, multipliers, and the daily cap logic.
- `tests/e2e/vocab.spec.ts` &mdash; runs through the happy path to ensure events fire and the UI remains
  accessible.

When writing new analytics for the ritual, add the event to `lib/analytics/events.ts` and update this
catalogue so product and growth teams keep a single source of truth.
