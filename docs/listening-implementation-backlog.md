# Listening Placeholder Implementation Backlog

Checklist of all files identified via the `"Auto-generated placeholder"` search and the implementation work needed before changing status away from `incomplete`.

## Pages (`pages/`)

- [ ] `pages/practice/listening/daily.tsx`
  - Steps: build daily practice flow (content feed, streak integration, attempt persistence).
  - Acceptance: authenticated user can start/complete daily session and see persisted outcome.
- [ ] `pages/learn/listening/tips.tsx`
  - Steps: implement tips catalog UI, filters, and CMS/data source wiring.
  - Acceptance: tips load from source, filters work, and empty/error states are handled.
- [ ] `pages/learn/listening/coach.tsx`
  - Steps: implement AI coach session UI, prompt controls, response rendering.
  - Acceptance: coach returns structured feedback and stores conversation history.
- [ ] `pages/learn/listening/mistakes.tsx`
  - Steps: implement mistake review list, remediation actions, and progress tracking.
  - Acceptance: users can view unresolved mistakes and mark them reviewed.
- [ ] `pages/tools/listening/accent-trainer.tsx`
  - Steps: build accent selection/training interface with scoring feedback.
  - Acceptance: user submits accent attempt and sees deterministic score breakdown.
- [ ] `pages/tools/listening/dictation.tsx`
  - Steps: implement dictation player/editor and grading interaction.
  - Acceptance: user can submit transcript and receive word-level corrections.
- [ ] `pages/analytics/listening.tsx`
  - Steps: implement analytics dashboard (trend cards, weak-skill insights).
  - Acceptance: dashboard loads historical metrics and renders without placeholder content.
- [ ] `pages/analytics/listening/trajectory.tsx`
  - Steps: implement trajectory charting and date-range controls.
  - Acceptance: chart displays historical attempts with selectable time windows.
- [ ] `pages/me/listening/saved.tsx`
  - Steps: implement saved resources list, delete actions, pagination.
  - Acceptance: saved listening resources can be listed and unsaved by user.
- [ ] `pages/mock/listening/result.tsx`
  - Steps: implement legacy result surface or redirect to canonical dynamic route.
  - Acceptance: route no longer placeholder and presents valid result state.

## APIs (`pages/api/`)

- [ ] `pages/api/dev/seed/listening-one.ts`
  - Steps: add seed payload validation and idempotent seed transaction.
  - Acceptance: endpoint creates deterministic seed set with audit logs.
- [ ] `pages/api/ai/listening/coach.ts`
  - Steps: integrate AI coach runtime, schema-validated inputs/outputs, rate limiting.
  - Acceptance: returns coach guidance payload and logs token/cost telemetry.
- [ ] `pages/api/ai/listening/dictation.grade.ts`
  - Steps: integrate dictation grading engine and error taxonomy.
  - Acceptance: returns normalized grading JSON with actionable corrections.
- [ ] `pages/api/ai/listening/accent.check.ts`
  - Steps: integrate accent analysis provider and confidence thresholds.
  - Acceptance: response includes accent signals, confidence, and fallback behavior.
- [ ] `pages/api/mock/listening/create-run.ts`
  - Steps: create run lifecycle record with auth and test assignment.
  - Acceptance: returns run identifier and initializes per-section state.
- [ ] `pages/api/mock/listening/save-answers.ts`
  - Steps: implement batched answer upsert with optimistic concurrency.
  - Acceptance: accepted answers persist and return revision metadata.
- [ ] `pages/api/mock/listening/play-ping.ts`
  - Steps: implement audio-play telemetry ingestion and anti-spam guard.
  - Acceptance: valid pings recorded with run/section linkage.
- [ ] `pages/api/mock/listening/submit-final.ts`
  - Steps: finalize run, compute scoring, lock run for edits.
  - Acceptance: final submission returns immutable result summary.
- [ ] `pages/api/admin/listening/tips.moderate.ts`
  - Steps: implement moderation queue actions with role-based access control.
  - Acceptance: only admins can approve/reject and actions are auditable.
- [ ] `pages/api/listening/attempts/export.csv.ts`
  - Steps: implement CSV generation pipeline and access checks.
  - Acceptance: downloads standards-compliant CSV with scoped records.
- [ ] `pages/api/listening/attempts/log.ts`
  - Steps: implement attempt event ingestion validation and storage.
  - Acceptance: event schema enforced and invalid events rejected with 4xx.
- [ ] `pages/api/listening/mistakes/review.ts`
  - Steps: implement review mutation endpoint for mistake lifecycle.
  - Acceptance: review updates persisted and reflected in subsequent fetches.
- [ ] `pages/api/listening/practice/toggle.ts`
  - Steps: implement practice preference toggle persistence.
  - Acceptance: preference toggles survive refresh and return current value.
- [ ] `pages/api/listening/tips/submit.ts`
  - Steps: implement tip submission with sanitization/moderation metadata.
  - Acceptance: submission accepted, stored, and queued for moderation.
- [ ] `pages/api/listening/save.ts`
  - Steps: implement saved-resource write path and duplicate protection.
  - Acceptance: save succeeds once per user/resource and supports idempotency.
- [ ] `pages/api/listening/mini/grade.ts`
  - Steps: implement mini-test grading + feedback normalization.
  - Acceptance: endpoint returns score, band mapping, and rationale fields.

## Components (`components/`)

- [ ] `components/listening/SaveButton.tsx`
  - Steps: implement authenticated save toggle UI with pending/success states.
  - Acceptance: button reflects saved state and error rollback behavior.
- [ ] `components/listening/analytics/DrillBreakdown.tsx`
  - Steps: implement drill chart/summary widgets from analytics data contracts.
  - Acceptance: component renders deterministic visual output for fixture data.
- [ ] `components/listening/dictation/DictationEditor.tsx`
  - Steps: implement editor interactions, timestamp markers, and validation.
  - Acceptance: editor supports edit/submit/reset and accessibility keyboard flows.
- [ ] `components/listening/players/AccentSwitcher.tsx`
  - Steps: implement accent switching UI + selected state persistence.
  - Acceptance: selection updates player source and preference is restored.
- [ ] `components/listening/quizzes/TimedMiniTest.tsx`
  - Steps: implement timed question workflow and autosubmit on timeout.
  - Acceptance: timer, submission, and score callbacks behave predictably.
- [ ] `components/listening/accent/AccentClip.tsx`
  - Steps: implement clip playback controls and transcript/metadata display.
  - Acceptance: clip loads playable media with proper loading/error states.

## Libraries (`lib/`)

- [ ] `lib/ai/listening/dictationAdapter.ts`
  - Steps: implement provider adapter, retries, and schema normalization.
  - Acceptance: adapter returns stable typed response for supported providers.
- [ ] `lib/listening/accentMap.ts`
  - Steps: define canonical accent mapping and utility helpers.
  - Acceptance: mapping covers required accents and passes type-level checks.
- [ ] `lib/listening/errors.ts`
  - Steps: define listening error classes/codes and serializer helpers.
  - Acceptance: shared errors produce consistent API-safe payloads.
- [ ] `lib/listening/insights.ts`
  - Steps: implement insight derivation utilities from attempt metrics.
  - Acceptance: helper returns repeatable insights for fixed fixtures.

## Tooling

- [ ] `scripts/ensure-listening-tree.sh`
  - Steps: replace placeholder templates with scaffolds aligned to production conventions.
  - Acceptance: generator creates non-placeholder starter files and passes shell lint.
