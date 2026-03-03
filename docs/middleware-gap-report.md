# Middleware Gap Report (Phase 1.1.1)

This report audits protected route coverage against `middleware.ts`.

## /dashboard

- Route count: **24**
- Middleware prefix protection: **Covered** (`/dashboard` in `PROTECTED_PREFIXES`).
- Sample routes:
  - `/dashboard/activity`
  - `/dashboard/ai-reports`
  - `/dashboard/billing`
  - `/dashboard/components/shared/FeaturePreviewWrapper`
  - `/dashboard/components/shared/NotificationCenter`
  - `/dashboard/components/shared/UpgradeModal`
  - `/dashboard/components/tiers/FreeView`
  - `/dashboard/components/tiers/OwlView`
  - `/dashboard/components/tiers/RocketView`
  - `/dashboard/components/tiers/SeedlingView`
  - `... +14 more`

## /profile

- Route count: **10**
- Middleware prefix protection: **Covered** (`/profile` in `PROTECTED_PREFIXES`).
- Sample routes:
  - `/profile/account/activity`
  - `/profile/account/billing`
  - `/profile/account`
  - `/profile/account/redeem`
  - `/profile/account/referrals`
  - `/profile/billing`
  - `/profile`
  - `/profile/setup`
  - `/profile/streak`
  - `/profile/subscription`

## /settings

- Route count: **8**
- Middleware prefix protection: **Covered** (`/settings` in `PROTECTED_PREFIXES`).
- Sample routes:
  - `/settings/accessibility`
  - `/settings/account`
  - `/settings/billing`
  - `/settings`
  - `/settings/language`
  - `/settings/notifications`
  - `/settings/profile`
  - `/settings/security`

## /admin

- Route count: **24**
- Middleware prefix protection: **Covered** (`/admin` in `PROTECTED_PREFIXES`).
- Sample routes:
  - `/admin/content/reading`
  - `/admin/imp-as`
  - `/admin`
  - `/admin/listening`
  - `/admin/listening/articles`
  - `/admin/listening/media`
  - `/admin/partners`
  - `/admin/premium/pin`
  - `/admin/premium/promo-codes`
  - `/admin/premium/promo-usage`
  - `... +14 more`

## /teacher

- Route count: **6**
- Middleware prefix protection: **Covered** (`/teacher` in `PROTECTED_PREFIXES`).
- Sample routes:
  - `/teacher/Welcome`
  - `/teacher/cohorts/<id>`
  - `/teacher`
  - `/teacher/onboarding`
  - `/teacher/pending`
  - `/teacher/register`

## Findings

- All required phase-1 route groups are protected by middleware prefix matching.
- Added server-side role checks in middleware for `/admin/*` and `/teacher/*` with redirect to `/403`.
- Added expired-session redirect handling to `/login?reason=session_expired` to prevent stale-cookie access.
