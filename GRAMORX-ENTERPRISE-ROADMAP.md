# GRAMORX ENTERPRISE TRANSFORMATION ROADMAP — PHASES 0–8

This document consolidates the complete execution plan for transforming GramorX from ~70% maturity to **100% Enterprise SaaS Standard**. It is structured into eight major phases, each broken down into epics, stories, subtasks, and acceptance criteria. Use this as a master tracking document for your team.

---

## 📋 Table of Contents

- [Phase 0 – Codebase Stabilization](#phase-0--codebase-stabilization)
- [Phase 1 – Authentication Hardening](#phase-1--authentication-hardening)
- [Phase 2 – Subscription System Refactor](#phase-2--subscription-system-refactor)
- [Phase 3 – AI Usage & Cost Protection](#phase-3--ai-usage--cost-protection)
- [Phase 4 – Full Database Security (RLS Completion)](#phase-4--full-database-security-rls-completion)
- [Phase 5 – Enterprise Profile Upgrade](#phase-5--enterprise-profile-upgrade)
- [Phase 6 – Performance & Scalability Optimization](#phase-6--performance--scalability-optimization)
- [Phase 7 – Audit Logging & Monitoring](#phase-7--audit-logging--monitoring)
- [Phase 8 – Global SaaS Readiness](#phase-8--global-saas-readiness)

---

## 🧱 PHASE 0 — CODEBASE STABILIZATION

**Goal:** Make architecture predictable before security hardening.

### 🟦 EPIC 0.1 — Enforce Folder Architecture Standard

**Objective:** Standardize project structure to enterprise layout.

#### 🎫 Story 0.1.1 — Audit Current Folder Structure

- List all folders under `/app` or `/pages`.
- List all folders under `/components`.
- Identify files containing business logic inside page files.
- Identify API calls inside UI components.
- Identify duplicated logic across routes.
- Create Architecture Violation Report (`/docs/architecture-audit.md`).

**Acceptance Criteria:** Full list of violations documented; report committed.

#### 🎫 Story 0.1.2 — Define Official Folder Structure

- Create missing folders according to target structure:
  - `/app` or `/pages` → routing only
  - `/components` → UI only
  - `/hooks` → data fetching & state
  - `/lib` → core business logic
  - `/services` → external integrations
  - `/types` → global TypeScript types
  - `/docs` → architecture documentation
- Add `README.md` inside each folder explaining purpose.
- Commit structure baseline.

**Acceptance Criteria:** Folder structure aligned with enterprise rule; documentation added.

### 🟦 EPIC 0.2 — Extract Business Logic From Pages

**Objective:** Pages must only handle routing and layout.

#### 🎫 Story 0.2.1 — Refactor Profile Pages

- Open `/profile/index`.
- Remove direct data fetching logic.
- Move data fetching into `hooks/useProfile.ts`.
- Move business logic into `lib/profile.ts`.
- Ensure page only renders components.

**Acceptance Criteria:** No Supabase queries inside page file; no subscription logic in page.

#### 🎫 Story 0.2.2 — Refactor Subscription Pages

- Extract Stripe logic from page.
- Move subscription checks to `lib/subscription.ts`.
- Create `useSubscription()` hook.
- Remove duplicated plan checks.

**Acceptance Criteria:** Page file contains no plan logic; all plan logic centralized.

#### 🎫 Story 0.2.3 — Refactor AI Pages

- Remove AI usage check from UI.
- Move usage logic to `lib/usage.ts`.
- Move API call logic into `services/aiService.ts`.
- Replace inline fetch calls with service function.

**Acceptance Criteria:** No raw AI calls inside components; all AI calls routed through service layer.

### 🟦 EPIC 0.3 — Create Core Service Layer

**Objective:** Centralize business logic.

#### 🎫 Story 0.3.1 — Create Auth Utility Module

- Create `/lib/auth.ts` with functions:
  - `getAuthenticatedUser()`
  - `requireAuth()`
  - `requireRole()`
- Replace duplicated session checks across project.
- Remove direct session logic from components.

**Acceptance Criteria:** All APIs use `requireAuth()`; no direct session validation scattered.

#### 🎫 Story 0.3.2 — Create Subscription Utility Module

- Create `/lib/subscription.ts` with:
  - `getActiveSubscription()`
  - `isSubscriptionActive()`
  - `requireActiveSubscription()`
- Move subscription validation logic here.
- Replace UI-based checks with service usage.

**Acceptance Criteria:** All subscription logic centralized.

#### 🎫 Story 0.3.3 — Create Usage Utility Module

- Create `/lib/usage.ts` with:
  - `getTodayUsage()`
  - `incrementUsage()`
  - `checkLimit()`
- Move usage logic out of APIs.
- Replace inline limit checks.

**Acceptance Criteria:** No raw usage query in APIs; centralized usage enforcement.

### 🟦 EPIC 0.4 — Remove Duplicate Data Fetching

**Objective:** Prevent repeated Supabase calls.

#### 🎫 Story 0.4.1 — Create `useUser()` Hook

- Create `/hooks/useUser.ts`.
- Implement centralized user fetch.
- Cache result (React Query / SWR optional).
- Replace all individual user fetch calls.
- Test hydration behavior.

**Acceptance Criteria:** Only one canonical user‑fetch method exists.

#### 🎫 Story 0.4.2 — Remove Direct Supabase Calls From Components

- Search project for `supabase.from(`.
- Move those calls into hooks or lib.
- Ensure components are pure UI.

**Acceptance Criteria:** Components do not directly query database.

### 🟦 EPIC 0.5 — Layout Standardization

**Objective:** Prevent repeated layout code.

#### 🎫 Story 0.5.1 — Create Unified `DashboardLayout`

- Extract shared layout from dashboard pages.
- Move sidebar/header into reusable layout.
- Remove duplicate layout wrappers.
- Ensure mobile responsiveness preserved.

**Acceptance Criteria:** All dashboard routes use same layout component.

#### 🎫 Story 0.5.2 — Create `SettingsLayout`

- Extract common layout for:
  - profile
  - account
  - billing
  - security
- Add consistent navigation tabs.
- Remove duplicated header logic.

**Acceptance Criteria:** Settings pages visually and structurally consistent.

### 🟦 EPIC 0.6 — Type Safety Enforcement

**Objective:** Make TypeScript strict and predictable.

#### 🎫 Story 0.6.1 — Create Global Types Folder

- Create `/types/user.ts`, `/types/subscription.ts`, `/types/usage.ts`.
- Define `User`, `Subscription`, `Plan` interfaces.
- Replace `any` usage.
- Remove implicit typing.

**Acceptance Criteria:** No `any` in business-critical logic; strong typing across auth/subscription.

### 🟦 EPIC 0.7 — Documentation Baseline

**Objective:** Freeze architecture before security work.

#### 🎫 Story 0.7.1 — Create Architecture README

- Document folder rules.
- Document service layer rules.
- Document hook usage rules.
- Document API validation rule.

**Acceptance Criteria:** `/docs/architecture-baseline.md` committed; shared with team.

---

### 📦 PHASE 0 DONE WHEN:

- Pages contain no business logic.
- Subscription logic centralized.
- Usage logic centralized.
- Auth logic centralized.
- Layout standardized.
- Supabase queries not scattered.
- Types enforced.
- Documentation committed.

⏱ **Estimated Effort:** Solo: 7–10 days | Team of 2: 4–5 days.

---

## 🔐 PHASE 1 — AUTHENTICATION HARDENING

**Goal:** Zero client‑trust authentication. Outcome: Attack‑resistant, enterprise‑grade identity enforcement.

### 🟦 EPIC 1.1 — Universal Route Protection (Middleware Expansion)

**Objective:** Ensure no protected page renders without session validation.

#### 🎫 Story 1.1.1 — Audit Current Middleware Coverage

- List routes under `/dashboard`, `/profile`, `/settings`, `/admin`, `/teacher`.
- Identify currently protected vs unprotected.
- Create `/docs/middleware-gap-report.md`.

**Acceptance Criteria:** Full list of protected vs unprotected routes documented.

#### 🎫 Story 1.1.2 — Expand Middleware Protection Scope

- Update `/middleware.ts` to protect all required routes.
- Protect `/dashboard/*`, `/profile/*`, `/settings/*`, `/teacher/*`, `/admin/*`.
- Add fallback redirect to `/login`.
- Handle redirect loop prevention.

**Acceptance Criteria:** Unauthenticated users cannot access any protected route; all routes tested.

#### 🎫 Story 1.1.3 — Add Role‑Based Middleware Enforcement

- Fetch user role inside middleware.
- Block `/admin/*` if role ≠ admin.
- Block `/teacher/*` if role ≠ teacher/admin.
- Redirect unauthorized access to `/403`.
- Create `/403` page.

**Acceptance Criteria:** Students cannot access admin pages; teachers cannot access admin-only pages; all role checks server‑side.

### 🟦 EPIC 1.2 — Universal API Authentication Guard

**Objective:** Every API validates identity.

#### 🎫 Story 1.2.1 — Create Auth Utility Module

- Create `/lib/auth.ts` with:
  - `getAuthenticatedUser()`
  - `requireAuth()` (throws 401)
  - `requireRole(allowedRoles)`
- Add TypeScript types.
- Add error standardization.

**Acceptance Criteria:** Auth helper file created; no duplicate session checks remain.

#### 🎫 Story 1.2.2 — Refactor All APIs to Use `requireAuth()`

- Search project for `supabase.auth.getUser`.
- Replace with `requireAuth()`.
- Remove inline session validation.
- Standardize 401 response structure.
- Test each API route.

**Acceptance Criteria:** All API routes use centralized auth logic; no API route trusts frontend.

#### 🎫 Story 1.2.3 — Add `requireRole()` to Role‑Sensitive APIs

- Identify admin‑only APIs.
- Identify teacher‑only APIs.
- Add `requireRole(['admin'])` and `requireRole(['teacher','admin'])`.
- Test access control.

**Acceptance Criteria:** Role‑based APIs properly blocked.

### 🟦 EPIC 1.3 — Remove Client‑Side Auth Enforcement

**Objective:** Eliminate UI‑only security.

#### 🎫 Story 1.3.1 — Remove Client‑Only Route Guards

- Search for `if (!session)` in components.
- Remove redirect logic inside components.
- Replace with middleware enforcement.
- Ensure pages assume authenticated context.

**Acceptance Criteria:** Components no longer control access; middleware is single gatekeeper.

#### 🎫 Story 1.3.2 — Remove Role‑Based UI‑Only Restrictions

- Search for role checks in UI rendering.
- Ensure sensitive data not conditionally hidden only in UI.
- Confirm APIs enforce same rule.
- Keep UI role rendering for UX only.

**Acceptance Criteria:** UI hiding not mistaken for security.

### 🟦 EPIC 1.4 — Sensitive Operation Hardening

**Objective:** Protect high‑risk user actions.

#### 🎫 Story 1.4.1 — Enforce Re‑authentication for Sensitive Actions

- Identify sensitive actions: change password, change email, delete account, upgrade subscription.
- Add re‑auth flow (Supabase re‑authenticate).
- Prevent action if session too old.
- Add error feedback.

**Acceptance Criteria:** Sensitive changes require recent login.

#### 🎫 Story 1.4.2 — Add Audit Logging to Auth Events

- Create `audit_logs` insert inside login flow.
- Log failed login attempts.
- Log password change.
- Log role changes.
- Log logout.

**Acceptance Criteria:** All auth events stored in database; admin can view logs.

### 🟦 EPIC 1.5 — Session Security Hardening

**Objective:** Secure cookie & session handling.

#### 🎫 Story 1.5.1 — Enforce Secure Cookie Settings

- Ensure HTTP‑only cookies enabled.
- Set SameSite=strict.
- Set Secure=true in production.
- Verify no session stored in localStorage.

**Acceptance Criteria:** No auth token accessible via JS.

#### 🎫 Story 1.5.2 — Add Session Expiry Handling

- Detect expired session in middleware.
- Force redirect to login.
- Add user‑friendly session‑expired message.
- Test behavior after manual token deletion.

**Acceptance Criteria:** Expired sessions cannot access protected routes.

### 🟦 EPIC 1.6 — Authentication Test Coverage

**Objective:** Ensure enforcement is verified.

#### 🎫 Story 1.6.1 — Manual Security Testing Checklist

- Test cases: access dashboard without login; access profile without login; access admin route as student; hit API directly without token; hit API with expired token; attempt role escalation via frontend manipulation.
- Document results.

**Acceptance Criteria:** All tests passed.

#### 🎫 Story 1.6.2 — Write Basic Auth Integration Tests (Optional)

- Add test for protected route.
- Add test for role‑based block.
- Add test for expired session.

---

### 📦 PHASE 1 DONE WHEN:

- All protected routes guarded in middleware.
- All APIs use `requireAuth()`.
- Role‑based APIs use `requireRole()`.
- No client‑only access enforcement.
- Sensitive actions require re‑auth.
- Audit logs recording auth events.
- Secure cookie configuration verified.
- Manual attack tests passed.

⏱ **Estimated Effort:** Solo: 5–7 days | Team of 2: 3–4 days.

---

## 💳 PHASE 2 — SUBSCRIPTION SYSTEM REFACTOR

**Goal:** Single source of truth. Stripe‑grade architecture.

### 🟦 EPIC 2.1 — Migrate Subscription Data to Single Source of Truth

**Objective:** Remove subscription fields from `profiles` and make the `subscriptions` table the sole authoritative source.

#### 🎫 Story 2.1.1 — Audit Current Subscription Fields

- List all subscription‑related columns in `profiles`.
- Search codebase for direct reads/writes to those fields.
- Identify other tables storing subscription‑like data.
- Document in `/docs/subscription-audit.md`.

**Acceptance Criteria:** Comprehensive list of legacy subscription fields and their usage.

#### 🎫 Story 2.1.2 — Create or Verify `subscriptions` Table Schema

- Ensure table has: `id`, `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `plan_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`.
- Add foreign key to `profiles` if missing.
- Add indexes on `user_id`, `stripe_subscription_id`, `status`.
- Add RLS policies (preparation for Phase 4).

**Acceptance Criteria:** Table matches Stripe requirements; RLS enabled.

#### 🎫 Story 2.1.3 — Migrate Existing Subscription Data

- Write migration script to move data from `profiles` to `subscriptions`.
- Map legacy statuses to Stripe‑compatible statuses.
- Run on staging, verify, then production.

**Acceptance Criteria:** All existing subscription data migrated; rollback script available.

#### 🎫 Story 2.1.4 — Remove Subscription Columns from `profiles`

- Create migration to drop columns (e.g., `subscription_status`, `subscription_expires_at`).
- Update any remaining code references.

**Acceptance Criteria:** `profiles` no longer contains subscription fields.

### 🟦 EPIC 2.2 — Create Subscription Service Layer

**Objective:** Centralize all subscription logic in reusable, type‑safe utilities.

#### 🎫 Story 2.2.1 — Define Subscription Types

- Create `/types/subscription.ts`.
- Define `Subscription`, `Plan`, `SubscriptionStatus` types.

**Acceptance Criteria:** Strongly typed subscription objects used everywhere.

#### 🎫 Story 2.2.2 — Implement Core Subscription Functions

- Create `/lib/subscription.ts` with:
  - `getActiveSubscription(userId)`
  - `isSubscriptionActive(userId)`
  - `requireActiveSubscription(userId)`
  - `getUserPlan(userId)`
  - `getFeatureAccess(userId, feature)` (for future)
- Add error handling and logging.

**Acceptance Criteria:** Functions work and are used in place of inline queries.

#### 🎫 Story 2.2.3 — Replace Inline Subscription Queries

- Search for `supabase.from('subscriptions')` or direct queries.
- Replace with calls to `lib/subscription.ts` functions.
- Update components/hooks to use service.

**Acceptance Criteria:** No raw subscription queries remain.

### 🟦 EPIC 2.3 — Middleware & API Enforcement

**Objective:** Enforce subscription requirements at the server level.

#### 🎫 Story 2.3.1 — Protect Premium Routes in Middleware

- Define list of premium routes.
- In middleware, call `isSubscriptionActive(userId)`.
- If inactive, redirect to `/pricing` or 403.

**Acceptance Criteria:** Users without active subscription cannot access any premium route.

#### 🎫 Story 2.3.2 — Add Subscription Guard to All Premium APIs

- Identify all API routes under `/api/ai`, etc.
- Inside each, after `requireAuth()`, call `requireActiveSubscription(user.id)`.
- Return 403 with appropriate message.
- Frontend handles 403 gracefully.

**Acceptance Criteria:** No premium API can be called without active subscription.

#### 🎫 Story 2.3.3 — Remove UI‑Only Premium Hiding

- Audit components that conditionally show premium content based on local state.
- Replace with checks using hook that calls service.
- Ensure server‑side checks as above.

**Acceptance Criteria:** Hiding UI is not the primary security mechanism.

### 🟦 EPIC 2.4 — Stripe Webhook Hardening

**Objective:** Guarantee that Stripe events are correctly processed and the database stays in sync.

#### 🎫 Story 2.4.1 — Audit Existing Webhook Handler

- List all Stripe events currently handled.
- Verify webhook signature verification.
- Check error handling and idempotency.
- Identify missing events.
- Document findings.

**Acceptance Criteria:** Clear understanding of current webhook reliability.

#### 🎫 Story 2.4.2 — Implement Signature Verification

- Use `stripe.webhooks.constructEvent()` with endpoint secret.
- Return 400 if signature invalid.
- Move secret to environment variable.

**Acceptance Criteria:** Only genuine Stripe events are processed.

#### 🎫 Story 2.4.3 — Sync All Relevant Stripe Events

- Implement handlers for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Update `subscriptions` table with status, period, plan.
- Add idempotency key checking.

**Acceptance Criteria:** Database always reflects the latest Stripe state.

#### 🎫 Story 2.4.4 — Add Audit Logging for Subscription Changes

- In webhook handlers, insert into `audit_logs` with user_id, action, metadata.
- Log also when subscription is manually changed by admin.

**Acceptance Criteria:** Every subscription status change is recorded.

#### 🎫 Story 2.4.5 — Test Webhook Locally with Stripe CLI

- Set up Stripe CLI and forward events to localhost.
- Trigger subscription creation, update, deletion.
- Verify database updates correctly.

**Acceptance Criteria:** All tested events result in correct DB state.

### 🟦 EPIC 2.5 — Subscription UI Refactor

**Objective:** Update user‑facing subscription pages to use the new service and provide clear information.

#### 🎫 Story 2.5.1 — Create `/billing` Page with Current Plan & Usage

- Use `/lib/subscription.ts` to fetch active subscription.
- Display plan name, status, renewal date, cancel at period end.
- Show payment method (if stored) via Stripe.
- Add link to Stripe Customer Portal.
- Include usage meter from Phase 3 (if ready).

**Acceptance Criteria:** Users can see current subscription and manage via Stripe portal.

#### 🎫 Story 2.5.2 — Update Profile Page to Reference Billing Page

- Remove subscription details from profile.
- Add "Manage Subscription" button linking to `/billing`.

**Acceptance Criteria:** Profile page no longer contains subscription data.

#### 🎫 Story 2.5.3 — Implement Subscription Hooks for UI

- Create `hooks/useSubscription.ts` with:
  - `useSubscription()`
  - `useIsActive()`
  - `useFeatureAccess(feature)`
- Use SWR/React Query for caching.
- Replace inline subscription fetching.

**Acceptance Criteria:** UI components use hooks and reactively update.

#### 🎫 Story 2.5.4 — Add Upgrade Prompts for Inactive Users

- Create reusable `<UpgradePrompt />`.
- Show on premium pages when user not subscribed.
- Include CTA to `/pricing`.

**Acceptance Criteria:** Users see friendly upgrade prompts.

### 🟦 EPIC 2.6 — Testing & Validation

**Objective:** Ensure subscription system is reliable and bug‑free.

#### 🎫 Story 2.6.1 — Manual Test Plan

- Test scenarios: new sign‑up, purchase, upgrade, cancellation, renewal, payment failure, expiration.
- Document results.

**Acceptance Criteria:** All scenarios pass; no regression.

#### 🎫 Story 2.6.2 — Integration Tests (Optional)

- Set up test Stripe keys and mock webhook events.
- Test API endpoints with active/inactive users.
- Test webhook handling.

---

### 📦 PHASE 2 DONE WHEN:

- `profiles` no longer contains subscription fields.
- Subscription logic centralized in `/lib/subscription.ts`.
- Premium routes and APIs enforce active subscription.
- Stripe webhook hardened and syncs all events.
- Users can view/manage subscriptions via `/billing`.
- Manual testing confirms no desync and proper access control.

⏱ **Estimated Effort:** Solo: 6–8 days | Team of 2: 3–4 days.

---

## 🤖 PHASE 3 — AI USAGE & COST PROTECTION

**Goal:** Protect revenue by preventing AI abuse, enforcing plan‑based usage limits, and giving users clear visibility into their consumption.

### 🟦 EPIC 3.1 — Database & Types for Usage Tracking

**Objective:** Create the `usage_tracking` table and supporting database infrastructure.

#### 🎫 Story 3.1.1 — Design `usage_tracking` Table Schema

- Create migration for `usage_tracking` with columns:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references `auth.users`)
  - `feature` (text)
  - `requests` (integer, default 0)
  - `tokens` (integer, default 0) – optional
  - `date` (date)
  - `created_at` / `updated_at`
- Add unique constraint `(user_id, feature, date)`.
- Add indexes on `user_id`, `date`, `feature`.

**Acceptance Criteria:** Migration ready; table enforces uniqueness.

#### 🎫 Story 3.1.2 — Enable RLS on `usage_tracking`

- Enable RLS: `ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;`
- Create SELECT policy: `USING (auth.uid() = user_id)`.
- Create policy for service role/admin to have full access.

**Acceptance Criteria:** Users cannot see others' usage; admins can see all.

#### 🎫 Story 3.1.3 — Create TypeScript Types for Usage

- Create `/types/usage.ts` with `UsageRecord`, `UsageLimit`, `Feature` union.

**Acceptance Criteria:** Types used across codebase.

### 🟦 EPIC 3.2 — Usage Service Layer

**Objective:** Centralize all usage logic in reusable, secure utilities.

#### 🎫 Story 3.2.1 — Implement Core Usage Functions

- Create `/lib/usage.ts` with:
  - `getTodayUsage(userId, feature)`
  - `getUsageForDateRange(userId, feature, startDate, endDate)`
  - `incrementUsage(userId, feature, tokens?)` (upsert daily record)
  - `checkLimit(userId, feature)`
  - `getUsagePercentage(userId, feature)`
- Add error handling and logging.

**Acceptance Criteria:** Functions work with Supabase and handle concurrency.

#### 🎫 Story 3.2.2 — Define Plan‑Based Limits

- Store limits in code (e.g., `PLAN_LIMITS`) or create a `plan_limits` table.
- Ensure limits accessible to usage service.

**Acceptance Criteria:** Service can retrieve daily limit for a user based on their plan.

#### 🎫 Story 3.2.3 — Add Subscription‑Aware Limit Checking

- Import `getActiveSubscription` from `/lib/subscription.ts`.
- If no active subscription, treat as `free` plan.
- Compare usage with limit; return false if exceeded.

**Acceptance Criteria:** Limit checks are accurate based on user's actual plan.

### 🟦 EPIC 3.3 — API & Middleware Enforcement

**Objective:** Ensure every AI request is guarded by usage checks.

#### 🎫 Story 3.3.1 — Create Unified Usage Guard for API Routes

- In `/lib/usage.ts`, create `async function guardAIRequest(userId, feature, tokens?)`
  - Calls `requireActiveSubscription(userId)`? (or assume already called)
  - Calls `checkLimit(userId, feature)` – throws 429 if exceeded.
  - On success, increments usage.
- Ensure function throws standardized errors.

**Acceptance Criteria:** Guard handles all steps: subscription, limit check, increment.

#### 🎫 Story 3.3.2 — Refactor All AI API Routes to Use Usage Guard

- Identify AI routes (writing, speaking, grammar, etc.).
- Inside each, after authentication, call `guardAIRequest(user.id, feature)`.
- Handle 429 responses gracefully.
- Update frontend to display "Limit reached".

**Acceptance Criteria:** Every AI request is metered and blocked if over limit.

#### 🎫 Story 3.3.3 — Add Usage Tracking to Middleware (Optional)

- If any AI generation happens in server actions or `getServerSideProps`, ensure guard is called there.

**Acceptance Criteria:** All AI usage, regardless of invocation, is tracked.

### 🟦 EPIC 3.4 — Usage Meter UI

**Objective:** Provide users with real‑time visibility into their usage.

#### 🎫 Story 3.4.1 — Create Usage Hook

- Create `hooks/useUsage.ts` with `useUsage(feature)` returning:
  - `used`, `limit`, `percentage`, `isLoading`, `error`
- Use SWR/React Query.

**Acceptance Criteria:** Hook returns live usage data.

#### 🎫 Story 3.4.2 — Build Usage Meter Component

- Create reusable `<UsageMeter />` with props: `feature`, `showLabel?`, `size?`
- Display progress bar with percentage and text.
- Change color when approaching limit.

**Acceptance Criteria:** Component renders correctly and updates.

#### 🎫 Story 3.4.3 — Add Usage Meter to Profile / Billing Page

- On `/billing` or `/profile`, fetch all features.
- Render `<UsageMeter />` for each feature.
- Show summary.

**Acceptance Criteria:** Users can see consumption at a glance.

#### 🎫 Story 3.4.4 — Show Inline Usage Warnings

- Inside AI tools, add compact usage meter.
- Disable submit button when limit reached; show "Upgrade to continue".

**Acceptance Criteria:** Users always aware of remaining quota.

### 🟦 EPIC 3.5 — Testing & Monitoring

**Objective:** Ensure usage tracking is accurate and cost protection is effective.

#### 🎫 Story 3.5.1 — Manual Test Scenarios

- Test free user hitting limit, pro user higher limit, concurrent requests, token tracking (if implemented).

**Acceptance Criteria:** All scenarios pass.

#### 🎫 Story 3.5.2 — Add Admin Dashboard for Usage Monitoring (Optional)

- Create `/admin/usage` page listing top users, total requests per feature.

**Acceptance Criteria:** Admins can monitor system usage.

#### 🎫 Story 3.5.3 — Set Up Alerts for High Usage

- Write daily cron job to sum usage; send alert if threshold exceeded.
- Integrate with monitoring.

**Acceptance Criteria:** Team notified of potential cost overruns.

---

### 📦 PHASE 3 DONE WHEN:

- `usage_tracking` table exists with RLS.
- `/lib/usage.ts` provides complete tracking and limit checking.
- All AI API routes enforce usage limits and increment usage.
- Users see real‑time usage meters.
- Manual testing confirms limits enforced.
- (Optional) Admin usage monitoring.

⏱ **Estimated Effort:** Solo: 4–6 days | Team of 2: 2–3 days.

---

## 🛡 PHASE 4 — FULL DATABASE SECURITY (RLS COMPLETION)

**Goal:** Enforce row‑level security on every sensitive table so that even if the API layer is bypassed, the database itself protects data.

### 🟦 EPIC 4.1 — RLS Enablement on All Sensitive Tables

**Objective:** Identify every table that contains user‑specific or sensitive data and enable RLS.

#### 🎫 Story 4.1.1 — Audit Tables and Classify Sensitivity

- List all tables in the public schema.
- For each, determine if it contains user data, is a lookup table, etc.
- Create classification matrix in `/docs/rls-audit.md`.

**Acceptance Criteria:** Complete list with yes/no for RLS requirement.

#### 🎫 Story 4.1.2 — Enable RLS on All Sensitive Tables

- For each sensitive table: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Verify RLS enabled.

**Acceptance Criteria:** All sensitive tables have RLS enabled.

### 🟦 EPIC 4.2 — Create User‑Level Policies

**Objective:** Allow users to perform CRUD operations only on rows they own.

#### 🎫 Story 4.2.1 — Create SELECT Policies for User Tables

- For `profiles`, `subscriptions`, `usage_tracking`, `test_results`, `writing_submissions`, `speaking_feedback`, `progress_records`, `audit_logs` (if users need to see own logs), create:
  ```sql
  CREATE POLICY "Users can view own" ON table_name FOR SELECT USING (auth.uid() = user_id);
  ```

**Acceptance Criteria:** Users can only see their own rows.

#### 🎫 Story 4.2.2 — Create INSERT Policies for User Tables

- For tables where users can insert, create:
  ```sql
  CREATE POLICY "Users can insert own" ON table_name FOR INSERT WITH CHECK (auth.uid() = user_id);
  ```

**Acceptance Criteria:** Users can only insert rows with their own `user_id`.

#### 🎫 Story 4.2.3 — Create UPDATE Policies for User Tables

- For tables where users can update, create:
  ```sql
  CREATE POLICY "Users can update own" ON table_name FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  ```

**Acceptance Criteria:** Users cannot modify rows belonging to others.

#### 🎫 Story 4.2.4 — Create DELETE Policies (If Applicable)

- For tables like `writing_submissions`, create:
  ```sql
  CREATE POLICY "Users can delete own" ON table_name FOR DELETE USING (auth.uid() = user_id);
  ```
- For critical tables (e.g., `subscriptions`), no DELETE policy for users.

**Acceptance Criteria:** Users cannot delete rows belonging to others.

### 🟦 EPIC 4.3 — Admin Override Policies

**Objective:** Allow administrators to read/write all data for management purposes.

#### 🎫 Story 4.3.1 — Define Admin Role Detection

- Implement a function `is_admin()` that returns true for admin users (using JWT custom claim or an `admins` table).

**Acceptance Criteria:** Reliable admin detection exists.

#### 🎫 Story 4.3.2 — Create Admin SELECT Policies

- For each sensitive table, add policy:
  ```sql
  CREATE POLICY "Admins can view all" ON table_name FOR SELECT USING (is_admin());
  ```

**Acceptance Criteria:** Admin users can see all rows.

#### 🎫 Story 4.3.3 — Create Admin INSERT/UPDATE/DELETE Policies (Optional)

- For tables where admin modification is required, add similar policies with `USING (is_admin())`.

**Acceptance Criteria:** Admins can perform necessary CRUD operations.

### 🟦 EPIC 4.4 — Teacher Access Policies (If Applicable)

**Objective:** If the platform has teachers who need to access their students' data, implement appropriate policies.

#### 🎫 Story 4.4.1 — Define Teacher Role and Student Relationship

- Create a `classes` table linking teachers to students if not already present.
- Define a function `is_teacher_of(student_id)`.

**Acceptance Criteria:** Reliable way to check teacher‑student relationship exists.

#### 🎫 Story 4.4.2 — Create Teacher SELECT Policies

- For relevant tables (e.g., `test_results`), create policy:
  ```sql
  CREATE POLICY "Teachers can view their students' data" ON table_name FOR SELECT USING (is_teacher_of(user_id));
  ```

**Acceptance Criteria:** Teachers can only access data of students they teach.

### 🟦 EPIC 4.5 — Testing RLS Policies

**Objective:** Verify that all policies work as intended.

#### 🎫 Story 4.5.1 — Create Manual Test Plan

- Develop a test matrix covering user types and operations on each table.
- Write test cases.

**Acceptance Criteria:** Test plan documented.

#### 🎫 Story 4.5.2 — Execute Tests and Document Results

- Run test cases; fix failing policies; retest until all pass.

**Acceptance Criteria:** All test cases pass.

#### 🎫 Story 4.5.3 — Write Automated Tests (Optional)

- Use pgTAP or SQL scripts to assert expected query results for different roles.

**Acceptance Criteria:** Automated tests exist and pass.

### 🟦 EPIC 4.6 — Documentation and Enforcement

**Objective:** Ensure the team understands RLS and that future changes don't break security.

#### 🎫 Story 4.6.1 — Document All Policies

- Generate SQL definitions for all policies.
- Create `/docs/rls-policies.md` with human‑readable descriptions.

**Acceptance Criteria:** Complete policy documentation.

#### 🎫 Story 4.6.2 — Enforce RLS in Backend Code

- Audit all `supabase.from()` calls.
- Confirm they use correct auth context (user token or service key).
- Update any that bypass RLS unintentionally.

**Acceptance Criteria:** Backend code respects RLS.

---

### 📦 PHASE 4 DONE WHEN:

- RLS enabled on all sensitive tables.
- User‑level policies restrict access to own data.
- Admin policies allow full access.
- Teacher policies (if applicable) grant appropriate access.
- Test plan executed and all tests pass.
- Policies documented.

⏱ **Estimated Effort:** Solo: 4–6 days | Team of 2: 2–3 days.

---

## 🧠 PHASE 5 — ENTERPRISE PROFILE UPGRADE

**Goal:** Transform the user profile into a world‑class AI dashboard that displays learning progress, security controls, and billing transparency — all with an enterprise SaaS feel.

### 🟦 EPIC 5.1 — AI Dashboard Foundation

**Objective:** Gather, centralise, and serve the data needed for the AI‑powered profile dashboard.

#### 🎫 Story 5.1.1 — Define Dashboard Data Requirements

- List metrics: Estimated Band Score, Skill heatmap, Strengths/Weaknesses, Study streak, Improvement graph.
- Map each to source tables.
- Document in `/docs/dashboard-data-sources.md`.

**Acceptance Criteria:** Complete data source mapping.

#### 🎫 Story 5.1.2 — Create Dashboard Service Layer

- Create `/lib/dashboard.ts` with functions:
  - `getEstimatedBandScore(userId)`
  - `getSkillHeatmap(userId)`
  - `getStrengthsWeaknesses(userId)`
  - `getStudyStreak(userId)`
  - `getImprovementGraph(userId, days?)`

**Acceptance Criteria:** Functions return accurate, aggregated data.

#### 🎫 Story 5.1.3 — Create Dashboard Hooks

- Create `hooks/useDashboard.ts` with hooks like `useEstimatedBandScore()`, etc.
- Use SWR/React Query.

**Acceptance Criteria:** Components can consume dashboard data via hooks.

### 🟦 EPIC 5.2 — AI Dashboard UI Components

**Objective:** Build the visual components for the AI dashboard.

#### 🎫 Story 5.2.1 — Build Estimated Band Score Card

- Card with large band score, label, trend indicator, CTA.

**Acceptance Criteria:** Component renders.

#### 🎫 Story 5.2.2 — Build Skill Heatmap

- Horizontal bar chart or radar chart for skills.
- Use charting library (Recharts, etc.).

**Acceptance Criteria:** Heatmap clearly shows relative strengths/weaknesses.

#### 🎫 Story 5.2.3 — Build Strengths & Weaknesses Panel

- Two columns listing top strengths and weaknesses.

**Acceptance Criteria:** Users can quickly see best and worst skills.

#### 🎫 Story 5.2.4 — Build Study Streak Component

- Fire icon or streak counter displaying consecutive days.

**Acceptance Criteria:** Streak is prominently displayed.

#### 🎫 Story 5.2.5 — Build Improvement Graph

- Line chart with dates vs band score.
- Hover tooltips.

**Acceptance Criteria:** Graph shows progress trend.

#### 🎫 Story 5.2.6 — Assemble Dashboard Layout

- Create `/dashboard` page with responsive grid.
- Combine components; add loading skeletons.

**Acceptance Criteria:** Dashboard is visually appealing and functional.

### 🟦 EPIC 5.3 — Enterprise Security Panel

**Objective:** Give users visibility and control over their account security.

#### 🎫 Story 5.3.1 — Create Security Settings Page or Section

- Add `/settings/security` or a panel.

**Acceptance Criteria:** Security panel exists.

#### 🎫 Story 5.3.2 — Fetch and Display Active Sessions

- Use Supabase Auth to fetch sessions.
- Display device, IP, last active, current session indicator.

**Acceptance Criteria:** Users can see all active sessions.

#### 🎫 Story 5.3.3 — Add Device Login History

- Use `audit_logs` to fetch recent logins.
- Display table with timestamp, IP, success/failure.

**Acceptance Criteria:** Users can review login history.

#### 🎫 Story 5.3.4 — Implement Session Revocation

- Create API endpoint to delete session.
- Add "Revoke" button next to each session (except current).
- Confirm with modal.

**Acceptance Criteria:** Users can remotely log out from other devices.

#### 🎫 Story 5.3.5 — Show 2FA Status and Enable/Disable Flow

- Check if 2FA is enabled via Supabase.
- Show badge and link to enable/disable.

**Acceptance Criteria:** Users can manage 2FA.

#### 🎫 Story 5.3.6 — Show Email Verification Status

- Use `user.email_confirmed_at`.
- Show badge and "Resend verification email" if unverified.

**Acceptance Criteria:** Email verification status visible and actionable.

### 🟦 EPIC 5.4 — Billing Transparency Panel

**Objective:** Provide a clear view of subscription details and usage, plus invoice access.

#### 🎫 Story 5.4.1 — Create Billing Page or Section

- Ensure `/billing` exists (from Phase 2).

**Acceptance Criteria:** Billing page ready.

#### 🎫 Story 5.4.2 — Display Current Plan and Renewal Date

- Use `useSubscription()` hook.
- Show plan name, renewal date, cancellation status.

**Acceptance Criteria:** Plan info clear.

#### 🎫 Story 5.4.3 — Integrate Usage Meters

- Reuse `<UsageMeter />` for each feature.

**Acceptance Criteria:** Users see consumption relative to plan limits.

#### 🎫 Story 5.4.4 — Fetch and Display Invoice History

- Use Stripe API to fetch invoices.
- Create endpoint `/api/billing/invoices`.
- Render table with date, amount, status, download link.

**Acceptance Criteria:** Users can view/download past invoices.

#### 🎫 Story 5.4.5 — Add "Download Invoice" Button

- Use `invoice.invoice_pdf` from Stripe.

**Acceptance Criteria:** Invoices downloadable.

### 🟦 EPIC 5.5 — Integration and Polish

**Objective:** Ensure all new features work together seamlessly.

#### 🎫 Story 5.5.1 — Link Security and Billing Sections from Profile

- Add tabs or quick‑access cards on profile.

**Acceptance Criteria:** Easy navigation.

#### 🎫 Story 5.5.2 — Add Loading States and Error Handling

- Use skeletons; show error messages; allow retry.

**Acceptance Criteria:** No blank/broken UI.

#### 🎫 Story 5.5.3 — Responsive Design Audit

- Test on mobile/tablet; adjust layouts.

**Acceptance Criteria:** Fully responsive.

#### 🎫 Story 5.5.4 — Write Integration Tests (Optional)

- Test critical dashboard calculations and API endpoints.

---

### 📦 PHASE 5 DONE WHEN:

- AI dashboard displays band score, skill heatmap, strengths/weaknesses, streak, and improvement graph.
- Security panel shows active sessions, login history, allows session revocation, and displays 2FA/email verification status.
- Billing panel shows current plan, renewal date, usage meters, and invoice history with downloads.
- All components responsive; loading/error states handled.
- Navigation between profile sections intuitive.

⏱ **Estimated Effort:** Solo: 7–10 days | Team of 2: 4–6 days.

---

## ⚡ PHASE 6 — PERFORMANCE & SCALABILITY OPTIMIZATION

**Goal:** Ensure the platform can handle 1M+ users with fast load times, reduced server costs, and a smooth user experience.

### 🟦 EPIC 6.1 — Data Fetching Optimization

**Objective:** Eliminate redundant API calls, centralize data fetching, and implement caching.

#### 🎫 Story 6.1.1 — Audit Current Data Fetching Patterns

- List API routes and client‑side hooks.
- Identify duplicate calls and waterfalls.
- Create `/docs/performance-audit.md`.

**Acceptance Criteria:** Clear understanding of inefficiencies.

#### 🎫 Story 6.1.2 — Implement Central User Context with Caching

- Create `/contexts/UserContext.tsx` using React Context/Zustand.
- Fetch user once at app root with SWR/React Query.
- Provide `user`, `profile`, `subscription`, `isLoading`, `mutate`.
- Replace individual `useUser()` hooks.

**Acceptance Criteria:** Only one user fetch per page load/session.

#### 🎫 Story 6.1.3 — Implement SWR / React Query Across the App

- Install and configure SWR or React Query.
- Create hooks for all major data types using the library.
- Configure global cache settings.

**Acceptance Criteria:** All data fetching uses library; duplicate requests deduplicated.

#### 🎫 Story 6.1.4 — Implement Optimistic Updates for Mutations

- Identify mutation points.
- Use `useMutation` with `onMutate` to update cache optimistically.
- Handle rollback on error.

**Acceptance Criteria:** Users see immediate feedback.

#### 🎫 Story 6.1.5 — Parallelize Data Fetching Where Possible

- Use `Promise.all` or `useQueries` to fetch independent data in parallel.

**Acceptance Criteria:** No unnecessary waterfalls.

### 🟦 EPIC 6.2 — Pagination Everywhere

**Objective:** Prevent loading unlimited data into the UI.

#### 🎫 Story 6.2.1 — Audit All Lists for Pagination

- Identify all lists: notifications, test results, submissions, feedback, logs, invoices.
- Document in `/docs/pagination-audit.md`.

**Acceptance Criteria:** Complete list.

#### 🎫 Story 6.2.2 — Implement Pagination in Backend APIs

- Choose pagination strategy (offset/cursor).
- Update API endpoints to accept `page`, `limit`, etc.
- Modify queries to use `LIMIT` and `OFFSET`.
- Return metadata: `total`, `page`, `totalPages`, `hasMore`.

**Acceptance Criteria:** All list endpoints support pagination.

#### 🎫 Story 6.2.3 — Implement Pagination in Frontend Components

- Create reusable `<Pagination />` component.
- Update lists to fetch paginated data using React Query.
- Add page numbers or "Load More".

**Acceptance Criteria:** Only current page data loaded.

#### 🎫 Story 6.2.4 — Implement Infinite Scroll (Optional)

- Use `useInfiniteQuery` for certain lists.
- Add "Load More" on scroll.

**Acceptance Criteria:** Smooth infinite scroll.

### 🟦 EPIC 6.3 — Code Splitting & Lazy Loading

**Objective:** Reduce initial bundle size.

#### 🎫 Story 6.3.1 — Analyze Current Bundle Size

- Run `next build` and analyze with `@next/bundle-analyzer`.
- Identify large dependencies.

**Acceptance Criteria:** Clear picture of bundle composition.

#### 🎫 Story 6.3.2 — Implement Route‑Based Code Splitting

- Verify Next.js automatically splits; if not, configure dynamic imports for routes.

**Acceptance Criteria:** Page bundles loaded only when needed.

#### 🎫 Story 6.3.3 — Lazy Load Heavy Components

- Use `next/dynamic` for heavy components: charts, AI modules, rich text editors.
- Add loading fallbacks.

**Acceptance Criteria:** Heavy components load after initial render.

#### 🎫 Story 6.3.4 — Optimize Third‑Party Libraries

- Replace large libraries with lighter alternatives (e.g., `date-fns` instead of `moment`).
- Ensure tree‑shakeable imports.

**Acceptance Criteria:** Bundle size reduced.

### 🟦 EPIC 6.4 — Database Query Optimization

**Objective:** Ensure database queries are efficient.

#### 🎫 Story 6.4.1 — Identify Slow Queries

- Enable query logging in Supabase.
- Capture slow queries.

**Acceptance Criteria:** List of slow queries.

#### 🎫 Story 6.4.2 — Add Missing Indexes

- Analyze query patterns.
- Add indexes on `user_id`, `created_at`, composite indexes as needed.

**Acceptance Criteria:** Indexes added; query times improved.

#### 🎫 Story 6.4.3 — Eliminate N+1 Queries

- Detect N+1 patterns.
- Refactor to use joins or batched queries.

**Acceptance Criteria:** No N+1 in critical paths.

#### 🎫 Story 6.4.4 — Implement Database Caching (Optional)

- Set up Redis for expensive, read‑heavy queries.
- Cache with appropriate TTL; invalidate on mutations.

**Acceptance Criteria:** Expensive queries cached; DB load reduced.

### 🟦 EPIC 6.5 — Image & Asset Optimization

**Objective:** Reduce image sizes and leverage CDN.

#### 🎫 Story 6.5.1 — Implement Next.js Image Component

- Replace `<img>` with `next/image`.
- Configure domains; set sizes and priority.

**Acceptance Criteria:** Images optimized and lazy‑loaded.

#### 🎫 Story 6.5.2 — Set Up CDN for Static Assets

- If using Vercel, CDN is automatic.
- If self‑hosted, configure Cloudflare; verify `Cache-Control` headers.

**Acceptance Criteria:** Assets cached and served from edge.

### 🟦 EPIC 6.6 — Frontend Rendering Optimization

**Objective:** Reduce render blocking and improve perceived performance.

#### 🎫 Story 6.6.1 — Implement Virtual Scrolling for Long Lists

- Use `react-window` for very long lists.

**Acceptance Criteria:** Smooth scrolling with thousands of items.

#### 🎫 Story 6.6.2 — Reduce Render Blocking CSS/JS

- Use Next.js built‑in CSS optimization.
- Defer third‑party scripts with `next/dynamic` or `async`/`defer`.

**Acceptance Criteria:** Improved Lighthouse scores.

#### 🎫 Story 6.6.3 — Implement Skeleton Screens

- Create skeleton components for each data type.
- Use React Suspense or conditional rendering.

**Acceptance Criteria:** Users see meaningful placeholders.

### 🟦 EPIC 6.7 — Monitoring & Continuous Improvement

**Objective:** Set up tools to monitor performance and catch regressions.

#### 🎫 Story 6.7.1 — Add Lighthouse CI

- Set up Lighthouse CI GitHub Action.
- Configure thresholds for key metrics.

**Acceptance Criteria:** PRs checked for performance impact.

#### 🎫 Story 6.7.2 — Implement Real User Monitoring (RUM)

- Add RUM script to track Core Web Vitals.
- Set up dashboards; alert on degradation.

**Acceptance Criteria:** Team can monitor production performance.

#### 🎫 Story 6.7.3 — Document Performance Best Practices

- Create `/docs/performance-best-practices.md` covering patterns, pagination, image optimization, code splitting, bundle budgets.
- Share with team.

**Acceptance Criteria:** Team has reference for performance standards.

---

### 📦 PHASE 6 DONE WHEN:

- Data fetching centralised and cached.
- All lists paginated.
- Heavy components lazy‑loaded.
- Bundle size optimised and analysed.
- Database queries indexed and N+1 free.
- Images optimised and served via CDN.
- Virtual scrolling implemented where needed.
- Performance monitoring tools in place.
- Lighthouse scores green (performance ≥ 90).

⏱ **Estimated Effort:** Solo: 7–10 days | Team of 2: 4–6 days.

---

## 📊 PHASE 7 — AUDIT LOGGING & MONITORING

**Goal:** Achieve enterprise‑grade compliance and security visibility by recording every critical action, providing administrators with tools to review activity, and setting up monitoring for suspicious behaviour.

### 🟦 EPIC 7.1 — Audit Logging Infrastructure

**Objective:** Create the database structure and service layer to capture audit events.

#### 🎫 Story 7.1.1 — Design `audit_logs` Table Schema

- Create migration with columns:
  - `id` (uuid)
  - `user_id` (uuid, nullable)
  - `action` (text)
  - `resource` (text, nullable)
  - `resource_id` (uuid/text, nullable)
  - `old_data` (jsonb)
  - `new_data` (jsonb)
  - `ip_address` (inet)
  - `user_agent` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)
- Add indexes on `user_id`, `action`, `created_at`, `resource`, and GIN on metadata.
- Enable RLS.

**Acceptance Criteria:** Migration ready; table supports flexible logging.

#### 🎫 Story 7.1.2 — Enable RLS and Create Admin Policy for `audit_logs`

- Enable RLS.
- Create policy for regular users: block all (or allow SELECT own logs if needed).
- Create policy for admins: `USING (is_admin())` for SELECT.

**Acceptance Criteria:** Users cannot read logs; admins can.

#### 🎫 Story 7.1.3 — Create Audit Service Layer

- Create `/lib/audit.ts` with `logEvent(params)`.
- Automatically capture IP and user agent from request (pass `req` or headers).
- Include helper functions: `logLogin`, `logLogout`, `logSubscriptionChange`, etc.
- Ensure async, fire‑and‑forget.

**Acceptance Criteria:** Service functions exist and capture correctly.

#### 🎫 Story 7.1.4 — Add Database Triggers for Critical Tables (Optional)

- Identify tables: `profiles`, `subscriptions`, etc.
- Write trigger function to insert into `audit_logs` with `old_data`/`new_data`.
- Create triggers for INSERT, UPDATE, DELETE.

**Acceptance Criteria:** Changes to protected tables are automatically logged.

### 🟦 EPIC 7.2 — Core Audit Events

**Objective:** Instrument key user and system actions.

#### 🎫 Story 7.2.1 — Log Authentication Events

- In login callback: `audit.logLogin`.
- In logout: `audit.logLogout`.
- Failed logins: `action: 'login_failed'` with metadata.
- Password changes: `action: 'password_change'`.

**Acceptance Criteria:** All auth events logged.

#### 🎫 Story 7.2.2 — Log Role Changes

- Where role changes happen, call `audit.logEvent` with `action: 'role_change'`, `old_data`, `new_data`.

**Acceptance Criteria:** Role changes audited.

#### 🎫 Story 7.2.3 — Log Subscription Changes

- In Stripe webhook handlers, call audit functions with details.
- Log manual admin changes.

**Acceptance Criteria:** Every subscription change traceable.

#### 🎫 Story 7.2.4 — Log Profile Updates

- In profile update API, capture old and new profile; log with `action: 'profile_update'`.

**Acceptance Criteria:** Profile edits logged.

#### 🎫 Story 7.2.5 — Log AI Usage and Limits

- In `guardAIRequest`, when limit exceeded, log `action: 'usage_limit_exceeded'`.
- Optionally log each AI request (with sampling).

**Acceptance Criteria:** Usage limit violations logged.

#### 🎫 Story 7.2.6 — Log Security Events

- Log 2FA enable/disable, email verification, session revocation.

**Acceptance Criteria:** Security actions audited.

### 🟦 EPIC 7.3 — Admin Audit Viewer

**Objective:** Provide an interface for administrators to search and review audit logs.

#### 🎫 Story 7.3.1 — Create Admin Audit Log Page

- Build `/admin/audit` route, protected by admin role.

**Acceptance Criteria:** Admin can access page.

#### 🎫 Story 7.3.2 — Implement Audit Log API with Filtering & Pagination

- Endpoint `/api/admin/audit-logs` with query params: `userId`, `action`, `resource`, `startDate`, `endDate`, `page`, `limit`.
- Query `audit_logs` with indexes.
- Return paginated response.

**Acceptance Criteria:** API returns logs respecting filters and pagination.

#### 🎫 Story 7.3.3 — Build Audit Log Viewer UI

- Table with columns: timestamp, user email, action, resource, IP, user agent.
- Expandable row to see full JSON.
- Filter inputs and pagination.
- Use React Query.

**Acceptance Criteria:** Admin can browse logs with ease.

#### 🎫 Story 7.3.4 — Add Export Functionality (Optional)

- Export button triggers download of filtered logs as CSV/JSON.
- Endpoint `/api/admin/audit-logs/export`.

**Acceptance Criteria:** Admin can export logs.

### 🟦 EPIC 7.4 — Suspicious Activity Detection

**Objective:** Proactively identify potential abuse or security threats.

#### 🎫 Story 7.4.1 — Define Suspicious Patterns

- Collaborate to define rules: multiple failed logins, rapid role changes, excessive usage limit hits, logins from new devices followed by sensitive actions.
- Document in `/docs/suspicious-patterns.md`.

**Acceptance Criteria:** Clear rules defined.

#### 🎫 Story 7.4.2 — Implement Anomaly Detection Script

- Write scheduled job (cron) querying `audit_logs` for patterns.
- For each detection, insert into `alerts` table.

**Acceptance Criteria:** Script detects patterns and records alerts.

#### 🎫 Story 7.4.3 — Create Alerts Table and Admin Viewer

- Create `alerts` table: `id`, `type`, `severity`, `user_id`, `details` (jsonb), `resolved`, `created_at`.
- Build `/admin/alerts` page to view and resolve alerts.

**Acceptance Criteria:** Admin can manage alerts.

#### 🎫 Story 7.4.4 — Send Real‑time Alerts (Optional)

- Integrate with Slack/Email for critical alerts.

**Acceptance Criteria:** Critical alerts reach team immediately.

### 🟦 EPIC 7.5 — Monitoring & Observability

**Objective:** Set up external monitoring for system health and audit log integrity.

#### 🎫 Story 7.5.1 — Integrate with Logging Service

- Forward audit logs to external service (Logtail, Datadog, etc.) for long‑term retention.

**Acceptance Criteria:** Audit logs available externally.

#### 🎫 Story 7.5.2 — Set Up Dashboard for Key Metrics

- Create dashboard showing audit log volume, top actions, failed logins over time, etc.

**Acceptance Criteria:** Team can monitor activity trends.

#### 🎫 Story 7.5.3 — Implement Audit Log Integrity Checks

- Research append‑only storage or hashing; document measures.

**Acceptance Criteria:** Integrity measures documented.

---

### 📦 PHASE 7 DONE WHEN:

- `audit_logs` table exists with RLS and indexes.
- Audit service logs authentication, role/subscription changes, profile updates, security actions.
- Database triggers automatically log changes to critical tables.
- Admin audit viewer exists with filtering and pagination.
- Suspicious activity detection script runs regularly and creates alerts.
- Alerts viewer for admins.
- (Optional) External logging integration and monitoring dashboard.

⏱ **Estimated Effort:** Solo: 6–8 days | Team of 2: 3–4 days.

---

## 🌍 PHASE 8 — GLOBAL SAAS READINESS

**Goal:** Elevate GramorX to a world‑class, globally compliant SaaS platform capable of serving enterprise customers, adapting to regional regulations, and supporting advanced pricing models.

### 🟦 EPIC 8.1 — GDPR & Privacy Compliance

**Objective:** Ensure the platform meets European data protection standards.

#### 🎫 Story 8.1.1 — Data Inventory & Mapping

- List all tables containing personal data; document purpose, retention, third‑party sharing.
- Create data flow diagram.
- Store in `/docs/gdpr-data-inventory.md`.

**Acceptance Criteria:** Complete data inventory documented.

#### 🎫 Story 8.1.2 — Implement User Data Export

- Create API endpoint `/api/user/export-data` to gather all user data.
- Compile into ZIP with JSON/CSV; send via email or return directly.
- Add UI button in profile settings.

**Acceptance Criteria:** Users can request and download their data.

#### 🎫 Story 8.1.3 — Implement Account Deletion Workflow

- Create "Delete Account" section with warnings.
- Require re‑authentication.
- On confirmation, start async deletion job: anonymize/delete records, cancel Stripe subscription, remove from `auth.users`.
- Send confirmation email; implement grace period.

**Acceptance Criteria:** Users can permanently delete accounts.

#### 🎫 Story 8.1.4 — Update Privacy Policy & Terms of Service

- Draft GDPR‑compliant Privacy Policy and ToS with legal counsel.
- Link in footer and during signup.

**Acceptance Criteria:** Legal documents accessible and compliant.

#### 🎫 Story 8.1.5 — Implement Cookie Consent Banner

- Use `react-cookie-consent` to obtain consent for non‑essential cookies.
- Store preference; block non‑essential scripts until consent.

**Acceptance Criteria:** Users can give/withdraw consent.

#### 🎫 Story 8.1.6 — Data Retention Policy Enforcement

- Define retention periods.
- Write cron job to delete/anonymize old records monthly.

**Acceptance Criteria:** Old data purged automatically.

### 🟦 EPIC 8.2 — Multi‑Plan Scaling

**Objective:** Support multiple subscription plans, including enterprise and lifetime options.

#### 🎫 Story 8.2.1 — Design Plans Data Model

- Create `plans` table: `id`, `name`, `description`, `price_monthly`, `price_yearly`, `lifetime_price`, `features` (jsonb), Stripe price IDs, `sort_order`, `is_active`.
- Seed with current plans.
- Add admin UI (or manual SQL) to manage plans.

**Acceptance Criteria:** Plans stored in DB, extensible.

#### 🎫 Story 8.2.2 — Implement Plan Selection UI

- Update `/pricing` to fetch plans from API.
- Display cards with name, price, features; toggle monthly/yearly/lifetime.
- Use Stripe Checkout.

**Acceptance Criteria:** Pricing page reflects plans from DB.

#### 🎫 Story 8.2.3 — Add Enterprise Plan Support

- Add "Enterprise" card with "Contact Sales" button.
- Create contact form to send inquiry to sales team.

**Acceptance Criteria:** Enterprise inquiries captured.

#### 🎫 Story 8.2.4 — Implement Lifetime Plan Handling

- Create one‑time price in Stripe.
- On `invoice.paid`, set subscription status to `lifetime`.
- `isSubscriptionActive` returns true for lifetime users.

**Acceptance Criteria:** Lifetime purchases grant permanent access.

#### 🎫 Story 8.2.5 — Add Plan Change Logic

- Use Stripe Customer Portal for most changes.
- For custom flows, implement API endpoint to update Stripe subscription.
- Ensure webhook updates DB.

**Acceptance Criteria:** Users can switch plans seamlessly.

### 🟦 EPIC 8.3 — Feature Flag System

**Objective:** Enable controlled rollouts of new features, A/B testing, and per‑plan feature toggling.

#### 🎫 Story 8.3.1 — Design Feature Flag Data Model

- Option A: JSON column in `profiles`/`subscriptions`.
- Option B: `feature_flags` and `feature_flag_overrides` tables.
- Decide based on complexity.

**Acceptance Criteria:** Schema ready.

#### 🎫 Story 8.3.2 — Implement Feature Flag Service

- Create `/lib/features.ts` with `isFeatureEnabled(userId, featureName)`.
- Check global flag, rollout percentage, user overrides, plan‑based defaults.
- Cache flags.

**Acceptance Criteria:** Service accurately returns feature access.

#### 🎫 Story 8.3.3 — Integrate Feature Flags into UI and APIs

- Create `useFeature(featureName)` hook for UI.
- In API routes, call `requireFeature(userId, featureName)`.

**Acceptance Criteria:** Features can be toggled without code deployment.

#### 🎫 Story 8.3.4 — Build Admin Feature Flag Management UI

- `/admin/features` page (protected).
- List flags with global toggle, rollout slider, user overrides.
- Save changes to DB.

**Acceptance Criteria:** Admins can control feature flags.

### 🟦 EPIC 8.4 — Enterprise Contracts & Invoicing

**Objective:** Support enterprise customers with custom contracts, invoicing, and purchase orders.

#### 🎫 Story 8.4.1 — Implement Manual Invoice Creation

- Admin interface to create invoice: select customer, line items, due date.
- Use Stripe Invoices API.
- Record invoice ID; mark subscription active for the period.

**Acceptance Criteria:** Admins can bill enterprise customers manually.

#### 🎫 Story 8.4.2 — Add Support for Purchase Orders

- Add field in checkout flow for PO number.
- Store in subscription metadata; include on invoices.

**Acceptance Criteria:** PO numbers captured and displayed.

#### 🎫 Story 8.4.3 — Custom Contract Management

- Create `contracts` table: `id`, `user_id`, `file_url`, `start_date`, `end_date`, `terms`.
- Admin UI to upload contract and associate with user.
- Override subscription access based on contract dates.

**Acceptance Criteria:** Custom contracts managed.

### 🟦 EPIC 8.5 — Localization & Internationalization (Optional but Recommended)

**Objective:** Prepare for global audiences by supporting multiple languages and regional settings.

#### 🎫 Story 8.5.1 — Set Up i18n Framework

- Install and configure next‑i18next or similar.
- Set up language detection; create translation files for at least one additional language (e.g., Spanish).
- Add language switcher.

**Acceptance Criteria:** Site can be translated.

#### 🎫 Story 8.5.2 — Translate Key User‑Facing Pages

- Extract strings to translation keys.
- Add translations for chosen languages.
- Test switching.

**Acceptance Criteria:** Pages available in multiple languages.

#### 🎫 Story 8.5.3 — Handle Regional Formats

- Use `Intl` APIs for dates, currencies, numbers.
- Ensure correct formatting.

**Acceptance Criteria:** Formatting respects locale.

### 🟦 EPIC 8.6 — Investor‑Ready Documentation

**Objective:** Create documentation that demonstrates the platform's maturity to potential investors or acquirers.

#### 🎫 Story 8.6.1 — Architecture Overview Document

- Write high‑level overview of system architecture, tech stack, security measures, scalability.
- Include diagrams.

**Acceptance Criteria:** Clear, professional architecture doc.

#### 🎫 Story 8.6.2 — Security & Compliance Whitepaper

- Summarize security measures, RLS, auth hardening, audit logging, GDPR compliance.
- Include penetration testing results (if any).

**Acceptance Criteria:** Security whitepaper ready.

#### 🎫 Story 8.6.3 — Metrics & Growth Readiness

- Build admin dashboard with key metrics: MRR, active users, churn, usage.
- Prepare sample reports for investors.

**Acceptance Criteria:** Investors can see traction and scalability.

---

### 📦 PHASE 8 DONE WHEN:

- GDPR compliance features: data export, account deletion, privacy policy, cookie consent.
- Multi‑plan system with enterprise and lifetime plans.
- Feature flag system operational with admin UI.
- Enterprise contract/invoicing support.
- (Optional) i18n implemented.
- Investor‑ready documentation complete.

⏱ **Estimated Effort:** Solo: 8–12 days | Team of 2: 5–7 days.

---

## ✅ FINAL TARGET STATE (100%)

When all eight phases are complete:

- Zero client‑only security
- Stripe‑level subscription enforcement
- AI usage fully controlled
- RLS protecting all data
- Middleware guarding everything
- Profile competitive with top AI IELTS platforms
- Fully scalable architecture
- GDPR compliant
- Multi‑plan and feature flag ready
- Enterprise sales and investor ready

---

**Use this document to track progress, assign tasks, and ensure all aspects of the transformation are covered.**
