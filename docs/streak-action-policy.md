# Action-only streak policy

Streaks are updated only from **action submissions** (API-side), not from passive page views.

## Actions that trigger streak updates

- Writing submissions (`writing`)
  - `/writing`
  - `/ai/writing/[id]`
- Speaking completions (`speaking`)
  - `/speaking/practice`
  - `/speaking/roleplay/[scenario]`
  - `/speaking/simulator/*`
- Reading submissions (`reading`)
  - `/reading/[slug]/review`
  - `/reading/passage/[slug]`
- Vocabulary drill completions (`vocabulary`)
  - `/vocabulary/review`
  - `/vocabulary/quizzes/today`
  - `/vocabulary/my-words`
  - `/vocabulary/linking-words`
- AI / micro-lessons (`ai_lesson`)
  - `/ai/mistakes-book`
  - `/ai/study-buddy/session/[id]/practice`
  - `/ai/writing/[id]`
- Mock/exam final submissions (`mock`)
  - `/mock`
  - `/writing/exam/[id]`
  - `/speaking/roleplay`

## Non-triggering behavior

The following must not auto-increment streaks:

- Visiting dashboards or analytics pages
- Opening streak widgets/indicators
- Loading study plan pages without a real submission event
- Passive content reads without submission/attempt completion

## Implementation notes

- `lib/streak.ts` exports `completeToday(client, userId, activityType, metadata)`.
- API routes call `completeToday` only after successful actionable submissions.
- The API endpoint `/api/streak` accepts `activityType` and only updates for allow-listed activity types.
- Idempotency is enforced by per-day activity uniqueness in `streak_activity_log` (`user_id`, `day_key`, `activity_type`).
- Core streak progression remains PKT (`Asia/Karachi`) day-based.
