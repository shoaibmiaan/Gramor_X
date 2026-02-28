# Phase 1 / Task 1 — Domain Boundary Map for `public.profiles`

## Scope analyzed

I analyzed the current schema + app typings that define/read profile shape:
- `supabase/migrations/20251027_profiles_rls_hardening.sql`
- `supabase/migrations/20251030000001_align_profiles_for_setup.sql`
- `supabase/migrations/20251010000001_add_onboarding_progress.sql`
- `db/migrations/020_add_teacher_fields.sql`
- `types/profile.ts`
- `types/supabase.ts`

---

## 1) Categorized list of fields by domain

### Identity Domain (account + immutable-ish identity)
- `id` / `user_id`
- `email`
- `full_name` (transition field)
- `first_name` *(target v2)*
- `last_name` *(target v2)*
- `avatar_url`
- `role`
- `locale`
- `timezone`
- `phone` *(if used for account recovery/identity verification)*
- `phone_verified` *(if treated as identity/security posture)*
- `created_at`
- `updated_at`

### Subscription Domain
- `membership`
- `plan`
- `tier`
- `status` *(if used as billing/access state; if account state, keep separate under Identity)*
- `buddy_seats`
- `buddy_seats_used`

### Onboarding Domain
- `onboarding_step`
- `onboarding_complete`
- `setup_complete`
- `country`
- `english_level`
- `goal_band`
- `exam_date`
- `goal_reason`
- `learning_style`
- `study_prefs`
- `time_commitment`
- `time_commitment_min`
- `days_per_week`
- `study_days`
- `study_minutes_per_day`

### AI Domain
- `ai_recommendation`
- `mistakes_stats`

### Analytics Domain
- `daily_quota_goal`
- Any aggregated progress snapshot fields currently in profile (none guaranteed as canonical system of record)
- **Recommendation:** keep event/metric history out of `profiles` and move into `user_scores`, `score_history`, `streak_logs`, usage/event tables.

### Preferences Domain
- `preferred_language`
- `language_preference`
- `notification_channels`
- `whatsapp_opt_in`
- `marketing_opt_in`
- `quiet_hours_start`
- `quiet_hours_end`

### Teacher Domain
- `teacher_onboarding_completed`
- `teacher_approved`
- `teacher_subjects`
- `teacher_bio`
- `teacher_experience_years`
- `teacher_cv_url`

### Referral Domain
- No clearly canonical referral columns are currently anchored in `profiles` in active migrations.
- Referral data should live in dedicated referral entities (`referrals`, `referral_redemptions`, rewards ledger), not profile rows.

---

## 2) Fields that must stay in `profiles`

For v2 (identity-only `profiles`), keep:
- `id`
- `email`
- `first_name`
- `last_name`
- `avatar_url`
- `role`
- `locale`
- `timezone`
- `created_at`
- `updated_at`

### Legacy identity-adjacent fields to deprecate
- `full_name` (split into `first_name` + `last_name` during migration, then remove)
- `phone` (move to `user_preferences` or future `user_contacts` table)
- `settings` (JSON blob; decompose into structured preference tables)

---

## 3) Fields that should be migrated out of `profiles`

### To `subscriptions` / `plans`
- `membership`, `plan`, `tier`, billing/access `status`, `buddy_seats`, `buddy_seats_used`

### To onboarding tables (`onboarding_sessions` + onboarding snapshots)
- `onboarding_step`, `onboarding_complete`, `setup_complete`
- `country`, `english_level`, `goal_band`, `exam_date`, `goal_reason`, `learning_style`
- `study_prefs`, `time_commitment`, `time_commitment_min`, `days_per_week`, `study_days`, `study_minutes_per_day`

### To AI tables (`ai_recommendations`, `ai_diagnostics`)
- `ai_recommendation`, `mistakes_stats`

### To analytics tables (`user_scores`, `score_history`, `streak_logs`)
- `daily_quota_goal` (or equivalent goal configuration + observed activity events)

### To preferences tables (`user_preferences`, `notification_settings`)
- `preferred_language`, `language_preference`
- `notification_channels`, `whatsapp_opt_in`, `marketing_opt_in`
- `quiet_hours_start`, `quiet_hours_end`

### To teacher tables (`teacher_profiles`)
- `teacher_onboarding_completed`, `teacher_approved`, `teacher_subjects`, `teacher_bio`, `teacher_experience_years`, `teacher_cv_url`

### To referral tables (`referrals` + ledger)
- Any future referral profile attributes (invite code, counters, reward balances) should not be stored in `profiles`.

---

## 4) Migration risk assessment

### High risk
1. **Ambiguous plan field drift (`membership` vs `plan` vs `tier`):**
   - Multiple plan-ish fields exist in codepaths; risk of inconsistent entitlement behavior after split.
   - Mitigation: define single source of truth (`subscriptions.plan_id + subscriptions.status`) and map legacy fields with deterministic precedence.

2. **`full_name` to `first_name`/`last_name` conversion:**
   - Potential data loss/incorrect parsing for single-word names and multi-part surnames.
   - Mitigation: non-destructive migration with fallback (`first_name = full_name`, `last_name = null`) + UI-assisted correction later.

3. **`status` semantic overlap (account state vs subscription state):**
   - Existing code may treat one field as two concepts.
   - Mitigation: split into `account_status` (identity domain) and `subscription_status` (subscription domain) explicitly.

### Medium risk
4. **RLS breakage due to table split:**
   - Existing self-access policies are profile-centric.
   - Mitigation: clone owner-based RLS pattern (`auth.uid() = user_id`) across new user-owned tables before cutover.

5. **Null/default behavior changes:**
   - Arrays/json defaults currently mask nulls in app logic.
   - Mitigation: preserve defaults in target tables and run backfill with `COALESCE` safeguards.

6. **Cross-service reads (Edge Functions + API routes):**
   - Lifecycle/notification code currently reads profile notification + contact fields directly.
   - Mitigation: deploy compatibility view (`profile_v_legacy`) or dual-write during migration window.

### Low risk
7. **Teacher field extraction:**
   - Teacher fields are already logically isolated and optional.
   - Mitigation: straightforward move to `teacher_profiles` with one-to-one FK.

8. **Referral extraction:**
   - Referral data appears mostly table-driven already.
   - Mitigation: keep referral joins out of profile reads and migrate counters into dedicated referral aggregates.

---

## Recommended cutover order (non-breaking)
1. Create new domain tables + RLS.
2. Backfill from `profiles` to domain tables.
3. Add compatibility reads (view or repository join layer).
4. Switch application reads/writes to new tables.
5. Freeze legacy columns.
6. Drop legacy columns from `profiles` after verification window.
