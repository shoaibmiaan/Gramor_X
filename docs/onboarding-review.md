# Onboarding Review (Project-wide)

## Scope reviewed
- Route guards and onboarding redirects in middleware.
- Student onboarding pages under `pages/onboarding/*`.
- Onboarding APIs under `pages/api/onboarding/*`.
- Shared onboarding schema and profile update helpers.

## Executive summary
The onboarding area currently contains **two overlapping implementations** (legacy 4-step survey and newer 5-step guided flow) plus partially divergent API contracts. This makes behavior hard to predict and increases risk of partial profile updates.

## Key findings

### 1) Dual onboarding flows are active at the same time
- `pages/onboarding/index.tsx` renders a 4-step style “goal/timeline/baseline/vibe” entry experience.
- The newer pages (`target-band`, `exam-date`, `study-rhythm`, `notifications`) use a 5-step language-first model and route map.
- Additional legacy pages still exist (`goal.tsx`, `timeline.tsx`, `baseline.tsx`, `vibe.tsx`).

**Impact**
- Users may enter different flows depending on entry URL and navigation history.
- Telemetry and DB fields can be populated inconsistently.

### 2) API contracts are inconsistent across onboarding endpoints
- `pages/api/onboarding/index.ts` expects step payloads shaped for language/goal/exam/study/notifications.
- Step-specific endpoints (`language.ts`, `target-band.ts`, etc.) rely on different payload fields and helpers.
- `pages/api/onboarding/complete.ts` updates and reads profile keys that differ from other onboarding handlers.

**Impact**
- Different pages can write different columns for equivalent concepts.
- Completion can succeed while earlier state is incomplete or stored under alternate fields.

### 3) Profile column naming is mixed (`id` vs `user_id`, `goal_band` vs `target_band`, etc.)
- Internal auth state lookup already uses fallback logic for both identifiers.
- Onboarding handlers use different column sets and aliases.

**Impact**
- Increased maintenance overhead and brittle migrations.
- Harder debugging when data appears “missing” under one query path.

### 4) Middleware onboarding gating is correct in intent, but depends on unified completion semantics
- Middleware correctly redirects authenticated, non-complete users to `/onboarding` for protected routes.
- If completion is written via one API path but read from another field/source, users can get redirect loops or stale state.

**Impact**
- User friction during first-run experience.

## Recommended consolidation plan

### Phase A (stabilize behavior)
1. Select **one canonical onboarding flow** (recommended: 5-step flow).
2. Keep `/onboarding` as the only entry route and make legacy pages redirect to canonical steps.
3. Enforce a single completion write path.

### Phase B (normalize contracts)
1. Define one canonical onboarding payload schema in `lib/onboarding/schema.ts`.
2. Make step-specific APIs call a shared service (or deprecate them in favor of one endpoint).
3. Normalize DB writes to canonical fields only; map legacy fields only in read-back compatibility layer.

### Phase C (safe migration + cleanup)
1. Add migration script/backfill for legacy columns to canonical columns.
2. Remove unused legacy onboarding pages and stale API variants.
3. Add smoke tests:
   - incomplete user → `/dashboard` redirects to `/onboarding`
   - final step completion → middleware stops redirecting
   - fresh GET `/api/onboarding` returns coherent state

## Suggested acceptance criteria
- A single route map drives all onboarding pages.
- A single API contract drives all onboarding writes.
- Completion is reflected consistently in middleware and auth state.
- No duplicated onboarding pages remain except intentional redirects.
