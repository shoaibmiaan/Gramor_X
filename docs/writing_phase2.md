# Writing Module · Phase 2 Enhancements

Phase 2 layers rewrite insights, study plan signals, and gamification on top of the baseline writing module introduced in Phase 1.

## Data Model Additions

| Table              | Purpose                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| `writing_feedback` | Stores band 9 rewrites, highlight spans, and focus blocks per writing response. |
| `user_xp_events`   | Records XP earned from writing attempts to drive leaderboards and streaks.      |
| `mistakes`         | Personal mistakes book populated from AI feedback.                              |
| `study_plan_focus` | Weighted focus tags that inform the study plan surface.                         |
| Indexes            | Keep XP lookups fast for analytics and gamification.                            |

Supabase RLS ensures learners can only read/write their own feedback while teachers/admins retain elevated access.

## API Surface

| Route                                  | Description                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `POST /api/ai/writing/score-v2`        | Upgrades the scorer with a band 9 rewrite, error spans, and focus blocks. Persists to `writing_feedback`. |
| `GET /api/analytics/writing/progress`  | Returns the last three attempts plus per-criterion deltas for the chart.                                  |
| `POST /api/gamification/award-writing` | Awards XP for an attempt if it has not been granted already.                                              |

All endpoints rely on `getServerClient(req,res)` and validate I/O via Zod schemas in `lib/validation/writing.v2.ts`.

## UI Enhancements

- **BandDiffView** — tabbed feedback component showing strengths, highlight spans, and the band 9 rewrite.
- **BandProgressChart** — visualises criterion trends and surfaces the improvement deltas.
- **VoiceDraftToggle** — client-side toggle that will wire into speech recognition in later phases.
- **Leaderboard filters** — adds a Writing skill filter alongside existing XP scopes.

The writing exam room now restores autosaves, auto-submits when the timer hits zero, and wraps the autosave logic in the reusable `useAutoSaveDraft` hook.

## Automation & Tests

- API unit tests cover the v2 scorer, analytics progress endpoint, and XP award route.
- Component tests verify the tabbed experience and progress chart render paths.

## Edge Function

`supabase/functions/mistake-sync` listens for `writing_feedback` inserts and syncs mistakes plus focus weights into downstream tables. Idempotency is enforced via (`attempt_id`,`type`,`excerpt_hash`).
