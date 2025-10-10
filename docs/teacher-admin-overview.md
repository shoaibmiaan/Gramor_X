# Teacher & Admin Workflow Overview

This document consolidates the recent teacher-facing and admin-facing pages so teams can see the scope of the combined work in one place.

## Teacher Journey
- **Entry point:** The dashboard at [`pages/teacher/index.tsx`](../pages/teacher/index.tsx) checks onboarding and approval status before routing teachers to the correct screen.
- **Application flow:** The form at [`pages/teacher/register.tsx`](../pages/teacher/register.tsx) lets prospective teachers submit their subjects and background information using the `TeacherOnboardingForm` component.
- **Detailed onboarding:** [`pages/teacher/onboarding.tsx`](../pages/teacher/onboarding.tsx) provides the full multi-section form with validation, document upload stubs, and progress tracking.
- **Status states:** Teachers see friendly waiting screens via [`pages/teacher/pending.tsx`](../pages/teacher/pending.tsx) after submitting, while [`pages/teacher/cohorts/[id].tsx`](../pages/teacher/cohorts/%5Bid%5D.tsx) exposes cohort management once approved.

## Admin Journey
- **Overview dashboard:** [`pages/admin/index.tsx`](../pages/admin/index.tsx) surfaces KPIs, queues, moderation tasks, and system status cards for admins and teachers with access.
- **Teacher approvals:** [`pages/admin/teachers/index.tsx`](../pages/admin/teachers/index.tsx) allows admins to review onboarding submissions and toggle approval states through server APIs.
- **Content management:** [`pages/admin/content/reading.tsx`](../pages/admin/content/reading.tsx) offers CRUD actions for reading tests, demonstrating how Supabase queries integrate with the UI.
- **Reviews workflow:** Attempt moderation is handled by [`pages/admin/reviews/index.tsx`](../pages/admin/reviews/index.tsx) and the detail view at [`pages/admin/reviews/[attemptId].tsx`](../pages/admin/reviews/%5BattemptId%5D.tsx), where staff can override AI band scores with audit trails.
- **User management & impersonation:** Utilities such as [`pages/admin/users.tsx`](../pages/admin/users.tsx), [`pages/admin/imp-as.tsx`](../pages/admin/imp-as.tsx), and [`pages/admin/stop-impersonation.tsx`](../pages/admin/stop-impersonation.tsx) consolidate account management and session tools.

## Why this matters
Bringing these flows together ensures that the teacher application pipeline, admin approvals, and review tooling live in a single deployable change set—matching the request to consolidate outstanding tasks into one PR.
