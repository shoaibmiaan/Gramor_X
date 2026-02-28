# Phase 1 Completion (Tasks 1–3)

## Delivered artifacts

1. **Task 1 — Domain extraction from `profiles`**
   - `supabase/architecture/phase1-task1-domain-boundary-map.md`

2. **Task 2 — Enterprise Schema v2**
   - `supabase/migrations/20260227000001_phase1_enterprise_schema_v2.sql`

3. **Task 3 — Data migration + rollback strategy**
   - `supabase/migrations/20260227000002_phase1_profiles_data_migration.sql`
   - `supabase/migrations/20260227000003_phase1_profiles_rollback.sql`

## Index strategy implemented

- Subscriptions: `(user_id, status)`, `(plan_id, status)`
- Score history: `(user_id, occurred_at DESC)`, `(occurred_at DESC)`
- Streak logs: `(user_id, activity_date DESC)`
- AI recommendations: `(user_id, active, created_at DESC)`
- AI diagnostics: `(user_id, created_at DESC)`
- Onboarding sessions: `(user_id, status, updated_at DESC)`
- Referrals: `(referrer_user_id, status, created_at DESC)`, `(referred_user_id, created_at DESC)`

## RLS strategy implemented

- Owner-based RLS (`auth.uid() = user_id`) for user-owned tables:
  - `subscriptions`, `user_scores`, `score_history`, `streak_logs`, `ai_recommendations`,
    `ai_diagnostics`, `onboarding_sessions`, `user_preferences`, `notification_settings`,
    `teacher_profiles`.
- Public-authenticated read for active `plans`.
- Party-based read for `referrals` (referrer or referred), and referrer-scoped insert.

## Cutover sequence reflected in migrations

1. Schema v2 tables + constraints + indexes + RLS.
2. Backup of existing profile rows.
3. Data copy from `profiles` into new domain tables.
4. Identity normalization in `profiles`.
5. Legacy domain columns dropped from `profiles`.
6. Rollback file available to restore legacy columns and values from backup.

## Profiles reduction scope

`profiles` is reduced to identity-only fields for v2:
- `id`, `email`, `first_name`, `last_name`, `avatar_url`, `role`, `locale`, `timezone`, `created_at`, `updated_at`

Legacy overloaded columns are migrated to domain tables and then removed, including onboarding/subscription/AI/teacher/preferences fields plus legacy `full_name`, `settings`, `phone`, and deletion lifecycle flags.
