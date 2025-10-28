# Writing Module Improvements — Execution Plan

## Overview

This plan translates the Writing module epic into a sequence of deliverables that preserve reliability, uphold Supabase security patterns, and align with the Pages Router architecture. Work is broken down into granular workstreams with explicit dependencies, success metrics, observability hooks, and QA gates.

### Guiding Principles

- **Security-first:** Apply RLS, `withPlan`, and rate-limiting from the start. Enforce schema validation with Zod across APIs.
- **Data durability:** Migrations are idempotent, reversible, and verified in staging before production rollout.
- **User experience:** Components reuse design-system tokens only, meet a11y benchmarks, and support confident offline progress.
- **Observability & QA:** Instrument all endpoints and workflows with structured logs, analytics, and automated regression coverage.

## Phase 0 — Environment Preparation

1. Audit current Supabase schema and confirm existing RLS policies for profiles, plans, and mistakes book. Document gaps that influence writing tables.
2. Confirm `withPlan` coverage and existing plan tiers to size access rules.
3. Establish Supabase migration workflow (local shadow DB, remote migration pipeline) and verify migration log location.
4. Align with analytics owners on GTM dataLayer contract updates.

**Exit Criteria:** Environment review doc signed off; migration pipeline tested end-to-end; analytics contract updated.

## Phase 1 — Database & Security Foundations (Epic A)

1. **Migrations:**
   - Author SQL migration files to create `writing_prompts`, `writing_attempts`, `writing_drill_events`, `writing_reviews`, `writing_readiness`, `writing_metrics`, and extend the mistakes book.
   - Implement enums using Postgres check constraints or dedicated enum types; align naming with existing conventions.
   - Add indexes for frequent lookups (`user_id`, `prompt_id`, `version_of`, `completed_at`).
2. **RLS Policies:**
   - Enable RLS on each table and craft policies for self-serve access, teacher/admin overrides, and service-role upserts.
   - Verify with automated policy tests covering owner, non-owner, teacher, and service-role behaviors.
3. **Seeds:**
   - Create seed script(s) for Task 1 and Task 2 prompts and annotated samples, organized by task pattern.
   - Populate drill taxonomy baseline data if not already present.
4. **Documentation:** Update migration log and security notes.

**Exit Criteria:** Migrations run clean locally and in staging; RLS tests pass; seed data available for UI/API development.

## Phase 2 — API Surface (Epic B)

1. Scaffold Pages Router API endpoints under `/pages/api/writing/*` using Supabase server client helpers and `withPlan` guards.
2. Define Zod schemas for all request/response payloads; derive TypeScript types from schemas.
3. Implement attempt lifecycle endpoints (start, save draft, submit, fetch, redraft) with structured logging and rate limits on sensitive mutations.
4. Implement scoring and metrics service endpoints that are restricted to service-role contexts; integrate queue/job framework if available.
5. Build drill, readiness, review, and rehearsal endpoints with shared helpers for auth, plan enforcement, and logging.
6. Generate OpenAPI documentation from Zod definitions and publish artifact to docs.
7. Add integration tests for key flows (start → submit → fetch) and rate-limit behavior.

**Exit Criteria:** Endpoints return typed responses, plan enforcement verified, rate limits active, and tests green.

## Phase 3 — Core UI Experiences (Epic C)

1. Create `/pages/writing/index.tsx`, `/pages/writing/[slug].tsx`, and `/pages/writing/[attemptId]/review.tsx` with SSR data loading via Supabase server client.
2. Build reusable components (`WritingEditor`, `WordCountBar`, `TimerBar`, `CriteriaMeters`, `FeedbackPanel`, `DiffViewer`, `DrillChecklist`, `RetakeGuard`) within the design-system constraints.
3. Implement autosave with debounce and offline queue, ensuring hooks use `supabaseBrowser()` and respect rate limits.
4. Add navigation and guard rails (leave confirmation, scoring pending states, readiness gating).
5. Run AXE and keyboard navigation audits; resolve issues.

**Exit Criteria:** Pages render with SSR data, autosave works, accessibility audits pass.

## Phase 4 — Advanced Guidance (Epics D & E)

1. Implement live critique API and client integration, ensuring suggestions remain additive and diff-tracked.
2. Build Paraphrase Studio, Lexical Variety Tracker, Cohesion Heatmap components, and associated backend computations.
3. Author drill content JSON under `data/writing/drills/` grouped by criterion and topic.
4. Develop drill runner UI with immediate feedback loop and recording via API.
5. Connect review outputs to drill recommendations and readiness unlocks.

**Exit Criteria:** Live critique and drills operate end-to-end, metrics recorded, and readiness logic recognizes drill completions.

## Phase 5 — Readiness, Plans & Reviews (Epics F & G)

1. Finalize readiness evaluation logic and integrate with retake plan UI.
2. Configure 14-day retake plan preset with progress persistence and reminder hooks.
3. Build peer review calibration flow, anonymous review submission, and teacher boost tooling (including audio upload storage with signed URLs).
4. Ensure attempt owners can access all reviews; add moderation controls as needed.

**Exit Criteria:** Users experience gated redrafts, plan progress tracking, and peer/teacher feedback loops.

## Phase 6 — Cross-Module Enhancements (Epic H)

1. Integrate reading module data to provide evidence suggestions with source citations.
2. Surface speaking insights for hedging/filler tightening suggestions during review and critique.
3. Validate cross-module data access complies with existing RLS policies and analytics tagging.

**Exit Criteria:** Contextual suggestions appear and can be inserted with single-click actions without breaking RLS boundaries.

## Phase 7 — Analytics, Integrity, Notifications (Epics I, J, K)

1. Instrument event map with consistent naming and payloads, updating GTM tracker file.
2. Implement originality checks and copy-paste guard notifications, storing flags on attempts.
3. Add optional WhatsApp/in-app notifications using extended profile channel preferences with audit logs.
4. Develop weekly band report generator and delivery pipeline.

**Latest status:** micro-prompt nudges now ship via WhatsApp or in-app notifications backed by the new `writing_notification_events` table and dashboard shortcuts so learners can act immediately.

**Exit Criteria:** Events visible in analytics dashboards, integrity features flag appropriately, notifications respect channel preferences, reports generated successfully.

## Phase 8 — Performance, Portal Integration & Quality (Epics L & M)

1. Optimize performance (prefetch routes, cache DS assets, lazy-load heavy panels) and achieve Lighthouse ≥ 90 across metrics.
2. Ensure complete a11y coverage with semantic markup and ARIA attributes.
3. Update home portal integrations with new CTAs and dynamic links.

**Latest status:** heavy studio tooling loads lazily (e.g., LanguageToolsDock via dynamic import) and the dashboard now surfaces writing CTAs (continue, review, drills, retake) within two clicks.

**Exit Criteria:** Performance metrics meet targets; navigation surfaces all key writing actions within two clicks.

## Phase 9 — QA & Release (Epic N)

1. Expand unit, integration, and e2e coverage (Playwright/Cypress) across start → write → submit → review → drill → redraft flows.
2. Prepare UAT scripts, acceptance checklist, and gather sign-offs from stakeholders.
3. Draft release notes, rollback plan, and schedule coordinated launch communications.

**Latest status:** vitest coverage now verifies writing notification helpers (daily prompt determinism, channel coercion, retake reminders).

**Exit Criteria:** All automated tests pass, UAT approved, release documentation complete.

## Risk Management & Contingencies

- **Migration rollback:** Maintain down scripts and tested point-in-time recovery strategy.
- **AI scoring dependencies:** Validate service quotas and fallbacks before launch.
- **Notifications compliance:** Coordinate with legal/privacy teams for WhatsApp opt-in flows.
- **Performance regressions:** Monitor real-user metrics post-launch and set alert thresholds.

## Deliverables Summary

- SQL migrations, seeds, and RLS policies with accompanying tests.
- API endpoints with Zod schemas, plan guards, rate limits, and OpenAPI docs.
- Pages Router screens and components adhering to DS tokens and a11y standards.
- Advanced critique, drills, readiness gating, peer/teacher review features.
- Analytics, integrity safeguards, notification workflows, performance optimizations.
- Comprehensive QA coverage, release runbook, and updated documentation.
