# Phase 4 / Task 8 — AI Recommendation Engine Structure

## Structured table model
AI recommendations are persisted in `public.ai_recommendations` with these fields:
- `id`
- `user_id`
- `type`
- `priority`
- `content`
- `model_version`
- `created_at`
- `expires_at`
- `consumed_at`

## What changed in app logic
- Study-plan generation (`/api/ai/study-plan/generate`) now writes structured recommendation entries to `ai_recommendations` instead of relying on profile JSON fields.
- Study-plan regeneration (`/api/ai/study-plan/regenerate`) now:
  - reads profile context from `user_preferences` + `onboarding_sessions.payload`
  - writes a structured regeneration recommendation row to `ai_recommendations`
- Dashboard aggregation keeps reading active recommendations from `ai_recommendations` and now passes model/version and lifecycle fields through to dashboard consumers.

## Dashboard consumption update
Dashboard recommendation text now resolves in priority order:
1. `content.summary`
2. `content.title`
3. fallback label derived from recommendation `type`

This keeps UI resilient while recommendations are progressively enriched.
