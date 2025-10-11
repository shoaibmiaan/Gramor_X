# Vocabulary SRS – Phase 3 Four-skill Drills

Phase 3 rounds out the roadmap by layering listening, speaking, reading, and writing drills onto the
existing word/collocation/gap cadence. Every review card now carries audio affordances, a
pronunciation check, a mini IELTS-style cloze, and a micro-writing prompt so learners cycle through
all four skills inside a single session.

## Schema updates

The combined `20251115_vocab_phase3_schema.sql` and
`20251120_vocab_phase3b_skills.sql` migrations introduce six additions:

- `user_word_stats.pron_attempts` tracks how many pronunciation checks a learner has triggered per
  headword. This counter is incremented by the new speaking API whenever a Web Speech attempt is
  submitted.
- `word_example_audio` stores per-example audio blobs/URLs (either human recordings or high-quality
  TTS) so both gap cards and collocation reveals can play contextual listening clips.
- `word_pron_attempts` captures each speaking attempt with optional blob URLs, transcripts, and
  similarity scores for future analytics.
- `word_writing_attempts`, `word_reading_attempts`, and `word_listening_attempts` capture per-user
  drill history with row-level security so learners can revisit their outputs and we can surface
  analytics later.
- `user_word_stats` now records `writing_attempts`, `reading_attempts`, and `listening_attempts` so
  the dashboard can surface four-skill progress rings without additional joins.

All new tables ship with row-level security: example audio remains publicly readable, while skill
attempts are restricted to the authenticated learner.

## API surface

- `GET /api/review/due` now hydrates example audio, returning playback metadata for gap cards and the
  contextual examples bundled with collocation reveals. The response also carries a `skills` bundle
  per card (mini-cloze, writing prompt, four-skill totals) so the UI can render richer drills without
  extra network round-trips.
- `POST /api/speaking/attempt` accepts `{ word_id, item_type, example_id?, score?, transcript?,
  target_text?, features? }`, persists the attempt in `word_pron_attempts`, and bumps the
  `pron_attempts` counter for the caller. The handler clamps scores between `0` and `1` and seeds
  stats rows on demand, so pronunciation practice works even before a learner has graded a card.
- `POST /api/writing/eval` accepts `{ word_id, item_type, text, prompt, register?,
  suggested_collocations? }`, runs deterministic checks for headword coverage, collocation usage,
  register violations, and sentence count, then stores both the attempt and the resulting score.
- `POST /api/reading/attempt` accepts `{ word_id, item_type, passage, blanks, responses }`, grades
  the three-blank IELTS-style cloze and records per-blank correctness so we can surface targeted
  feedback.
- `POST /api/listening/attempt` logs each audio playback event and increments the learner’s
  listening counter. The handler is intentionally lightweight so we can call it whenever a clip
  starts without slowing down the UI.

## Dashboard experience

- Word cards expose a "Play pronunciation" control wired to the stored `word_audio` asset plus a
  "Check pronunciation" button. The button instantiates the Web Speech API client-side, compares the
  recognised transcript against the target headword using a lightweight phoneme-distance heuristic,
  and surfaces friendly feedback (e.g., "Great job! Heard … — 84% match").
- Gap cards and collocation reveals render playback buttons for every available example, letting
  learners hear the phrase in context immediately after reveal.
- Each card now carries a “Use it in all 4” ribbon with four progress rings so learners see at a
  glance how many listening, speaking, reading, and writing reps they’ve banked for the current
  headword. A ten-exercise guarantee (3 reading blanks + 3 writing scenarios + word/collocation/gap +
  listening + speaking) ensures breadth.
- A reading mini-cloze sits below the base content, rendering the paragraph with inline inputs and
  surfacing coloured feedback per blank once the learner checks their answers.
- A micro-writing panel nudges learners to write two sentences with register hints and suggested
  collocations. Evaluations happen client-side via the new deterministic API and the score, feedback,
  and attempt count update instantly.
- Audio playback, reading checks, and writing submissions all persist to Supabase so future phases can
  analyse skill balance without reprocessing client state.

Together these changes let learners listen, speak, read, and write every vocabulary item without
leaving the Today’s Reviews panel.
