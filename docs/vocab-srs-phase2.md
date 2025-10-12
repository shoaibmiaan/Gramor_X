# Vocabulary SRS – Phase 2 Context & Collocation-first Release

Phase 2 builds on the foundation from [Phase 1](./vocab-srs-phase1.md) by shipping learner-facing
content and card layouts that emphasise collocations and contextualised gap fills. The goals align
with the roadmap brief: prioritise IELTS-aligned phrases, guarantee a rich queue of collocations,
and deliver the default 40/40/20 review balance.

## Content seeding

The automated generator at `scripts/generate_vocab_phase2.ts` hydrates the following assets from the
1000-word core list (`data/word-bank.json`):

- **Words**: deterministically keyed UUIDs for every headword with CEFR tiers, neutral register, and a
  single IELTS topic tag. The seeds keep legacy `word`/`meaning` columns in sync with
  `headword`/`definition`.
- **Collocations**: 2,000 authored collocations (two per headword) that carry IELTS topic notes and
  productive patterns such as `verb+noun` or `adjective+noun`.
- **Examples**: 3,000 context sentences split into crafted collocation examples and gap-ready prompts.
  Each example records an `ielts_topic` for mix analytics and the new gap cards.

Running the script regenerates JSON snapshots in `data/generated/` and writes the SQL payload to the
Phase 2 migration (`supabase/migrations/20251026_vocab_phase2_seed.sql`).

## Schema adjustments

Phase 2 introduces a lightweight `ielts_topic` column on `public.word_examples` so that API handlers
can filter or badge cards by IELTS theme:

```sql
alter table public.word_examples add column if not exists ielts_topic text;
create index if not exists word_examples_ielts_topic_idx on public.word_examples (ielts_topic);
```

## Review queue defaults

- `/api/review/due` now uses a weighted sequence to fetch **40% collocations, 40% words, 20% gap
  cards** by default. The handler still accepts custom mixes via `?mix=...`, but the fallback sequence
  enforces the Phase 2 balance.
- Collocation pulls merge in up to three contextual example sentences (non gap-ready) so the UI can
  surface usage immediately after reveal.
- Gap cards include the `ielts_topic` tag, enabling dashboards to visualise thematic coverage.

## Card presentation

- **Collocation card**: front face masks the headword in the chunk (e.g. `_____ growth`), while the
  reveal highlights the headword, shows the curated note, and lists context examples with IELTS topic
  chips.
- **Gap card**: front face renders the crafted sentence with underscores. Revealing the answer swaps
  the underscores for the headword and displays an explicit “Answer” line for active recall.
- **Word card**: now displays IELTS topic chips alongside existing CEFR/register badges.

Learners can tap the **Reveal answer** control before grading; grading also auto-reveals the card so
spacing actions always occur after exposure to the solution.
