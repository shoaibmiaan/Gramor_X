# Vocabulary Review Specification

This document defines the ground rules for the vocabulary spaced-repetition engine that powers the Mistakes Book review flow.

## Mastery definition

An item is considered **mastered** when it has three consecutive correct active-recall reviews that are graded as "hard", "medium", or "easy", **and** the most recently scheduled interval is at least 21 days. In the current implementation, the review streak is inferred from the `repetitions` counter (which counts consecutive successful reviews). Given the interval model below, the mastery condition is first satisfied after the fifth successful review, when the next scheduled interval reaches 32 days.

## Review intervals

Vocabulary reviews follow a fixed ladder of intervals (in days):

```
new → 1 → 3 → 7 → 16 → 32
```

The `new` stage is surfaced immediately (interval `0` days). Subsequent intervals are used to schedule the next review after each successful attempt. These values are centralized in `lib/spaced-repetition/index.ts` so they can be tuned with real review data in the future.

## Item formats

The vocabulary catalogue supports the following item types:

- **Single word** prompts
- **Collocations** (multi-word lexical chunks)
- **Sentence gap-fills** where a target phrase must be recalled
- **Speaking prompts** that require the learner to produce the item aloud
- **Writing mini-tasks** (short constructed responses)

These formats ensure coverage of both receptive and productive vocabulary knowledge.

## Coverage targets

The spaced-repetition queue should prioritize:

- ~1,000 high-frequency core vocabulary words; and
- 1,500–2,000 collocations, with room to grow monthly as new data arrives. Phase 2 seeds
  2,000 IELTS-oriented collocations (two per headword) and introduces contextual examples tagged by
  IELTS theme so the queue can balance topical exposure.

By default, mixed review sessions should present roughly **40% collocations, 40% single words, and
20% gap-fill sentences**, ensuring productive practice remains front-loaded.

## Completion criteria

Phase 0 is complete when this specification is checked into the repository and the review engine (in `lib/spaced-repetition/index.ts`) consumes these rules for scheduling and mastery decisions.

## Phase 3 – Four-skill drills per headword

Phase 3 extends the content and scheduling rules above with explicit listening and speaking drills for
each vocabulary item:

- Every word card now exposes curated audio (human or high-quality TTS) through the `word_audio`
  catalogue. Learners can trigger this playback inside the dashboard review flow via the "Play
  pronunciation" control.
- Contextual examples marked as gap-ready ship with parallel audio assets (stored in
  `word_example_audio`). These clips power listening exposure for both collocation reveals and gap
  cards.
- A lightweight pronunciation checker runs in the browser using the Web Speech API. The recognised
  transcript is compared against the target headword with a phonetic-distance heuristic, and the
  resulting attempt is saved through `POST /api/speaking/attempt`, incrementing each learner's
  `pron_attempts` counter in `user_word_stats`.
- Speaking attempts store raw similarity scores, transcripts, and optional blob URLs inside
  `word_pron_attempts`, unlocking richer feedback in later phases.

With these additions the review session covers reading, listening, writing, and speaking loops for
every headword while preserving the mastery intervals defined earlier.
