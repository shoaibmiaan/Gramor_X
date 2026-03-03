# Authentication Security Test Checklist (Phase 1.6.1)

## Scope

- Middleware protected routes
- Role-based route restrictions
- API auth guards
- Session expiry behavior
- Sensitive action re-auth checks

## Manual test matrix

1. Access `/dashboard` without login → redirected to `/login`.
2. Access `/profile` without login → redirected to `/login`.
3. Access `/admin` as non-admin role → redirected to `/403`.
4. Access `/teacher` as non-teacher/non-admin role → redirected to `/403`.
5. Call protected API without token (`/api/account/delete`) → `401` JSON auth error.
6. Call billing portal endpoint without recent auth (`/api/billing/create-portal-session`) → `403 reauthentication_required`.
7. Call subscription portal in open-portal mode without recent auth (`/api/subscriptions/portal`) → `403`.
8. Expired access token cookie on protected route → redirected to `/login?reason=session_expired`.
9. Attempt role escalation via frontend route change (`/admin/*` with student token) → middleware blocks.

## Result summary

- Core protections implemented in middleware and API utilities.
- Sensitive operations now include recent-auth checks.
- Logout events are now audit logged.
