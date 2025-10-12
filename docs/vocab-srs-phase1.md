# Vocabulary SRS – Phase 1 Data Model

Phase 1 introduces the persistence layer that supports the vocabulary spaced-repetition engine described in [`docs/vocab-spec.md`](./vocab-spec.md). The tables are defined in `supabase/migrations/20251020_vocab_srs_schema.sql` and surface the following responsibilities:

## Core catalogue

| Table | Purpose | Key columns |
| --- | --- | --- |
| `public.words` | Canonical list of vocabulary entries. Keeps legacy columns (`word`, `meaning`, `example`, `synonyms`, `interest_hook`) while introducing normalized SRS metadata. | `headword`, `pos`, `definition`, `freq_rank`, `ielts_topics[]`, `register`, `cefr` |
| `public.word_examples` | Authored or curated context sentences for each headword. | `text`, `source`, `is_gap_ready` |
| `public.word_collocations` | Collocations/patterns tied to a headword for productive practice. | `chunk`, `pattern`, `note` |
| `public.word_audio` | Pronunciation resources, including IPA and per-accent audio URLs. | `ipa`, `audio_url`, `tts_provider` |

## Learner state

| Table | Purpose | Key columns |
| --- | --- | --- |
| `public.user_word_stats` | Leitner/SuperMemo style counters per learner+word. | `status`, `ef`, `streak_correct`, `last_result`, `next_due_at`, `interval_days`, `ease` |
| `public.review_queue` | Materialized queue items awaiting review, typed by prompt format. | `item_type`, `item_ref_id`, `due_at`, `priority` |
| `public.user_prefs` | Per-learner configuration for vocabulary study. | `focus_skill[]`, `target_band`, `daily_quota_words` |

## Engagement

| Table | Purpose | Key columns |
| --- | --- | --- |
| `public.badges` | SRS and vocabulary achievement catalog. | `code`, `name`, `description`, `icon_url` |
| `public.user_badges` | Awarded badges per learner with optional metadata payload. | `awarded_at`, `metadata` |
| `public.leaderboards_daily` | Denormalized daily standings for streaks/XP. | `snapshot_date`, `rank`, `score`, `metrics` |

## Implementation notes

- `public.words` gains triggers to keep the legacy `word`/`meaning` columns in sync with the new `headword`/`definition` fields, and enforces register + CEFR constraints.
- All catalogue tables expose read access to any role, while mutating operations remain restricted to the Supabase service role.
- Learner-owned tables (`user_word_stats`, `review_queue`, `user_prefs`, `user_badges`) enforce row-level security tied to `auth.uid()` and leaderboard rows are scoped to the current user.
- Every timestamped table reuses the shared `public.set_updated_at()` trigger to maintain audit columns.

## API surface

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/review/due` | `GET` | Returns the learner&apos;s due queue, respecting item type mix and exposing skill distributions. |
| `/api/review/grade` | `POST` | Accepts `{ item_type, item_id, ease }`, updates SM-2-lite counters, reschedules the queue item, and flags mastery. |
| `/api/review/suspend` | `POST` | Suspends a leech by marking the stats row and removing it from the active queue. |

The Grade handler updates `interval_days`, `ef`, `streak_correct`, and `next_due_at` following the cadence documented in [`docs/vocab-spec.md`](./vocab-spec.md), while ensuring leeches become available immediately when failed.

## UI touchpoints

- The dashboard now surfaces a **Today&apos;s Reviews** panel with single-tap grading (Again/Hard/Good/Easy) and a live counter of remaining cards.
- A **Learning Path** chip visualises the Reading/Listening/Writing/Speaking mix using the learner&apos;s focus skills and due queue composition.
- Session progress reflects the Supabase `daily_quota_words` preference so learners can complete a 10-card (or personalised) block without leaving the dashboard.
