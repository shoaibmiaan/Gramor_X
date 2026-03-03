# Phase 9 — Enterprise Validation Audit (Static Code/Schema Verification)

Date: 2026-03-03

## Scope
This document verifies post-implementation architecture/security signals from code + migration files only (no live Supabase/Stripe runtime simulation).

## Validation summary

- ✅ **No raw `supabase.from()` in page components** (outside `pages/api/**`).
- ✅ **Centralized auth helpers exist** (`requireAuth`, `requireApiAuth`, `requireRole`).
- ⚠️ **`requireActiveSubscription()` exists but has no call sites** in the app code.
- ⚠️ **`profiles` schema still contains `plan`** in at least one hardening migration, which conflicts with strict subscription separation.
- ✅ **`usage_tracking` access is mostly centralized** in `lib/usage.ts`, with one explicit admin analytics endpoint reading it directly.
- ✅ **RLS enablement migrations exist** for `profiles`, `subscriptions`, `usage_tracking`, `audit_logs`, and `notifications` tables.

## Evidence

### 1) Architecture checks
- Command: `rg "supabase\.from\(" pages --glob '!pages/api/**'`
  - Result: no matches.
- `lib/auth.ts` defines `requireAuth`, `requireApiAuth`, and role guards.
- `lib/usage.ts` provides centralized usage check/increment utilities.

### 2) Subscription gate checks
- Command: `rg "requireActiveSubscription\(" -g'*.ts' -g'*.tsx'`
  - Result: only definition in `lib/subscription.ts`; no endpoint usage found.

### 3) Profiles-vs-subscription separation
- Command: `rg "membership_plan|subscription|plan|stripe" supabase/migrations/20251027_profiles_rls_hardening.sql -n`
  - Result: `plan text default 'free'::text` found in `profiles` hardening migration.

### 4) RLS coverage (migration-level)
- Command: `rg "ENABLE ROW LEVEL SECURITY|enable row level security|alter table .* enable row level security" supabase/migrations -n | rg "profiles|subscriptions|usage_tracking|audit_logs|notifications"`
  - Result: matching migrations found for all targeted tables.

## CTO-style conclusion
Based on static verification, the codebase appears **functionally strong but not structurally complete** for strict enterprise claims. The biggest blockers are:

1. Premium API enforcement is not provably mandatory because `requireActiveSubscription()` is not wired into route handlers.
2. Subscription-related plan data still appears in `profiles` migration history, indicating incomplete separation guarantees.

## Recommended immediate actions
1. Add a shared premium-route wrapper that enforces `requireAuth + requireActiveSubscription` and migrate premium endpoints to it.
2. Remove/retire plan fields from `profiles` schema path and lock plan state to `subscriptions` only.
3. Execute runtime drills (auth bypass, webhook signature spoofing, Stripe cancel desync) in staging and attach evidence to this report.
