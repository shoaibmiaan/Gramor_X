# Phase 5 — Performance & Observability

## Task 9 — Query optimization

### Query hotspots analyzed
1. Dashboard aggregate reads:
   - latest score from `score_history`
   - latest streak from `streak_logs`
   - active recommendations from `ai_recommendations`
   - latest subscription from `subscriptions`
2. Study plan regeneration context reads:
   - latest `onboarding_sessions`
   - `user_preferences`
   - active/newest `user_study_plans`

### Index additions
Implemented in `20260416000000_phase5_query_optimization.sql`:
- `score_history_user_occurred_cover_idx`
- `streak_logs_user_activity_cover_idx`
- `ai_recommendations_dashboard_cover_idx`
- `subscriptions_user_created_cover_idx`
- `user_study_plans_user_active_generated_idx`
- `onboarding_sessions_user_updated_cover_idx`
- `user_preferences_user_cover_idx`

### Query caching layer
- Added in-memory TTL cache (30s) in `lib/services/dashboardService.ts` keyed by `userId`.
- Cache is bypassable with `opts.skipCache`.

### Expected performance impact
- Fewer heap lookups on dashboard aggregate due to covering indexes.
- Lower p95 latency under burst traffic via short-lived aggregate cache.
- Lower planning/runtime cost for regeneration context lookup by reducing sort/filter scans.

## Task 10 — Observability layer

### Centralized logger utility
- Added `lib/obs/domainLogger.ts` built on `lib/obs/logger.ts`.
- Standardized domain events:
  - `ai.recommendation.generated`
  - `ai.recommendation.regenerated`
  - `subscription.changed`
  - `onboarding.completed`
  - `onboarding.survey_saved`
  - `score.updated`
  - `dashboard.aggregate_fetched`

### Integration points
- AI recommendation generation:
  - `pages/api/ai/study-plan/generate.ts`
  - `pages/api/ai/study-plan/regenerate.ts`
- Subscription changes:
  - `pages/api/webhooks/payment.ts` (subscription update/delete events)
- Onboarding completion:
  - `pages/api/onboarding/complete.ts`
  - `pages/api/onboarding/save-survey.ts`
- Score updates:
  - `pages/api/mock/reading/submit-final.ts`
- Dashboard reads:
  - `pages/api/dashboard/aggregate.ts`
