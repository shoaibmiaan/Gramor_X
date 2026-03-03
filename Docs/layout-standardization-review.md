# Layout Standardization & Page Consistency Review

## Skill usage
No skill was used for this task because it is a direct repository layout audit/refactor (not skill creation/installation).

## 1) Layouts discovered in `/components/layouts`

| Layout | Primary purpose | Structural UI provided |
|---|---|---|
| `AdminLayout` | Admin/teacher console pages | Sticky contextual header + horizontal section nav + contained card body |
| `AnalyticsLayout` | Analytics pages | Left sidebar nav + main content area |
| `AppLayoutManager` | Central layout router | Decides which layout wraps each page |
| `AuthLayout` | Login/signup/reset flows | Auth-centered shell with title/subtitle and auth body area |
| `BillingLayout` | Billing/subscription management | Billing header + billing tab/nav + content container |
| `CommunicationLayout` | Messages/chat/inbox | Messaging sidebar + main content area |
| `CommunityLayout` | Community pages | Community nav + content area |
| `DashboardLayout` | Main product workspace pages | Dashboard shell + workspace content frame |
| `GlobalPageLayout` | Neutral default page shell | Optional breadcrumbs + generic content wrapper |
| `InstitutionsLayout` | Institution/org pages | Institutional navigation and framed content |
| `LearningLayout` | Learning/lesson pages | Learning nav/structure + content wrapper |
| `MarketplaceLayout` | Marketplace/catalog pages | Marketplace context shell + content area |
| `OnboardingLayout` | Onboarding journeys | Step/journey style shell |
| `ProctoringLayout` | Proctoring/exam security pages | Focused minimal proctoring wrapper |
| `ProfileLayout` | Profile/settings/account pages | Profile/settings shell + content frame |
| `PublicMarketingLayout` | Non-home marketing pages | Marketing intro/quick-nav + framed content |
| `ReportsLayout` | Report pages | Report context shell + content container |
| `ResourcesLayout` | Library/resources pages | Resource sidebar + body area |
| `SupportLayout` | Help/support pages | Support header + tabs + content frame |
| `TeacherLayout` | Teacher area and onboarding gating | Teacher-specific role/access shell |
| `ExamLayout`, `ExamResourceLayout`, `WritingExamLayout` | Exam-focused contexts | Specialized exam wrappers where used |

## 2) Pages reviewed (`/pages`, excluding `/pages/api`)
- Completed a full filesystem pass for all files under `pages/` excluding `pages/api`.
- Generated full mapping artifact: `Docs/page-layout-mapping.md`.

## 3) Standardization changes applied

### A. Enforced a layout for all non-API pages in runtime flow
`AppLayoutManager` was updated so unresolved pages and no-chrome non-auth/non-proctoring pages now fall back to `GlobalPageLayout` instead of rendering raw page content. This removes standalone/singleton page rendering at runtime.

### B. Auth pages now consistently use `AuthLayout`
Removed special-case naked rendering for `/forgot-password` and `/update-password`, so they now receive `AuthLayout` like other auth routes.

### C. Home-page consistency retained
Marketing layout remains disabled for `/` to prevent duplicate top “Welcome/quick links” shell on the landing page. Home now uses neutral `GlobalPageLayout` fallback while still keeping consistent layout ownership in `components/layouts`.

## 4) Structural inconsistencies found

1. **Layout/router logic centralization is still heuristic**
   Prefix-based guard rules are hand-maintained and can drift as routes grow.

2. **Some layout components have overlapping domain boundaries**
   E.g. dashboard vs profile/settings/billing requires strict precedence to avoid shadowing.

3. **System files in `/pages` are non-route files**
   `_app.tsx`, `_document.tsx`, `README.md`, and CSS modules are in pages tree but are not routable pages.

## 5) Recommendations (enterprise level)

1. Introduce a typed route-to-layout registry (`route -> layout`) validated in CI.
2. Add layout contract tests (critical route snapshots: home, auth, dashboard, billing, admin, teacher, proctoring).
3. Add a lint rule/check preventing raw header/sidebar/footer duplication inside page files.
4. Migrate legacy per-page structural wrappers into layout components only.
5. Add telemetry/debug hook to expose resolved layout name in dev mode.

## 6) Mapping table
See full per-file mapping here:
- `Docs/page-layout-mapping.md`
