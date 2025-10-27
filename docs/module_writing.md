# Writing Module — Foundations

This document outlines the baseline implementation created in Phase 1 of the IELTS Writing module. It describes the database schema, API surface area, and frontend building blocks that allow end-to-end mock exams with autosave, AI scoring, and analytics.

## Database schema

The following Supabase migrations were added:

- `20251023_create_exam_attempts.sql` – creates the shared `exam_attempts` table.
- `20251023_create_exam_events.sql` – stores autosave and telemetry events.
- `20251023_create_writing_prompts.sql` – enriches the prompt catalogue with task metadata.
- `20251023_create_writing_responses.sql` – links writing responses to `exam_attempts` and stores band breakdowns.
- `20251023_rls_policies.sql` – applies row-level security for students and staff.
- `20251023_seed_writing_prompts.sql` – seeds two starter prompts (Task 1 and Task 2).

`exam_attempts` tracks the lifecycle of each mock exam (`in_progress → submitted → graded`). `exam_events` captures typing and autosave payloads used for analytics and draft restoration. `writing_responses` contains both drafts and final scores for Task 1 and Task 2.

## API overview

All endpoints are written for the Pages Router and use `getServerClient(req, res)` for Supabase access.

| Route                                            | Description                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `POST /api/mock/writing/start`                   | Creates an `exam_attempts` row, selects Task 1/Task 2 prompts, logs a `start` event.     |
| `POST/GET/PUT /api/mock/writing/save-draft`      | Persists autosave drafts, restores the latest snapshot, and logs focus/typing events.    |
| `POST /api/mock/writing/submit`                  | Finalises an attempt, scores both tasks with the baseline heuristic, and stores results. |
| `POST /api/ai/writing/score-v1` (`/score`)       | Stateless scorer that normalises essays into IELTS-style band data.                      |
| `POST /api/ai/writing/explain`                   | Returns criterion-level explanations derived from the v1 heuristic.                      |
| `GET /api/analytics/writing/summary`             | Provides the last 30 responses plus aggregated metrics.                                  |
| `GET/POST/PUT/DELETE /api/admin/writing/prompts` | Teacher-only CRUD for the prompt bank.                                                   |

All APIs return JSON payloads suitable for client consumption and rely on Zod schemas defined in `lib/validation/writing.ts`.

## Frontend structure

New UI components were introduced under `components/writing/`:

- `WritingExamRoom` – orchestrates the timed exam experience with autosave, submit, and prompt switching.
- `WritingTimer`, `WritingAutosaveIndicator`, `WritingPromptCard`, and `WritingResultCard` – reusable pieces used across dashboards and review pages.
- `components/exam/StickyActionBar` and `components/design-system/TextareaAutosize` – shared utilities for exam layouts.

Pages:

- `/writing` – dashboard to launch mocks and view recent analytics.
- `/mock/writing/[id]` – exam room shell using `WritingExamRoom`.
- `/mock/writing/results/[attemptId]` – post-submit summary with quick stats.
- `/mock/writing/review/[attemptId]` – detailed AI feedback for each task.

The exam room relies on `lib/hooks/useExamTimer`, `lib/writing/autosave.ts`, and `lib/writing/scoring.ts` for countdown, persistence, and scoring respectively.

## Testing

Two regression tests cover the foundation:

- `tests/api/writing.score.test.ts` validates the scoring API structure and persistence calls.
- `tests/pages/mock.writing.test.tsx` exercises the client exam flow (type → autosave → submit).

## Next steps

Phase 2 can extend this foundation by integrating real AI models, richer analytics visualisations, and teacher feedback workflows. The current scaffolding provides the necessary tables, routes, and UI primitives to build on.
