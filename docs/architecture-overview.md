# GramorX Architecture Overview

## Stack
- Next.js (pages router) for web app + API routes.
- Supabase Postgres with RLS policies for tenant/user isolation.
- Stripe for subscription billing and invoicing.
- SWR for client-side data fetching and cache deduplication.

## Core architecture layers
- `pages/` and `components/` for routing and UI.
- `lib/` for business rules (auth, subscription, usage, audit, feature flags).
- `services/` for provider abstractions.
- `supabase/migrations/` for auditable schema evolution.

## Security posture
- Middleware + API-level auth guards.
- Role enforcement for admin/teacher surfaces.
- Row-level security in database.
- Audit logging and suspicious-activity detection pipeline.

## Scalability posture
- Plan-based entitlement + usage controls.
- Paginated list APIs and reusable list controls.
- Phase 6 observability (Lighthouse + web vitals endpoint).
- Phase 8 readiness: plans table, feature flags, enterprise contracts/invoicing model.
