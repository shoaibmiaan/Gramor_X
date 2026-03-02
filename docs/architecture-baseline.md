# Architecture Baseline

This document defines the baseline architecture expectations for the codebase and is used as a team reference during development and code review.

## Folder responsibilities

### `app/pages` — routing and page composition
- Owns route mapping, route-level composition, and page entry points.
- Pages can assemble hooks + UI components, but should not implement domain/business rules.
- Keep page files thin and focused on navigation, rendering flow, and route-specific wiring.

### `components` — UI and presentation
- Contains reusable visual building blocks and page-level presentation components.
- Components should focus on rendering, interaction events, and display states.
- Components should avoid direct data access and business rule evaluation.

### `hooks` — data and state orchestration
- Encapsulates data fetching, caching, derived view state, and mutation orchestration.
- Hooks are the default interface that pages/components use to access application data.
- Hooks can call services and use lib utilities, then expose UI-ready state/actions.

### `lib` — business rules and domain logic
- Holds pure domain logic, invariants, policy checks, calculators, and reusable business workflows.
- Logic here must be framework-agnostic where possible and easy to unit test.
- `lib` is the source of truth for business behavior used by hooks/services.

### `services` — integrations and transport
- Handles external boundaries: HTTP clients, SDK wrappers, database adapters, queues, and provider APIs.
- Services convert external payloads into internal contracts and return typed results.
- Services should not decide business policy; they only execute integration concerns.

### `types` — global contracts
- Defines shared TypeScript contracts (DTOs, domain types, API request/response types, cross-layer interfaces).
- Prefer reusing shared contracts from `types` instead of redefining shapes in local files.
- Any contract used across multiple layers should live here.

## Service-layer rules
- No business logic in `app/pages` or `components`.
- Business decisions (eligibility, plan gating, rule evaluation, scoring, entitlement decisions, etc.) belong in `lib`.
- `services` should perform integration tasks only (I/O, serialization/deserialization, retries, headers, provider-specific mapping).
- Pages/components may call hooks; hooks may call services and lib; services may depend on types and low-level helpers.

## Hook usage rules
- Data access should be routed through hooks consumed by pages/components.
- Components should remain presentational: accept props, render UI, and emit user intent callbacks.
- Hooks own loading/error/success state handling and provide stable, UI-ready interfaces.
- Avoid calling service clients directly from components unless there is an explicitly documented exception.

## API validation and authentication rules
- Centralize API guardrails for authentication, authorization, subscription, and usage limits.
- Request validation (schema/type checks) must happen at API boundaries before domain logic runs.
- Auth/subscription/usage checks should be implemented in shared middleware/guard utilities to ensure consistency.
- Endpoint handlers should compose: validate input → enforce auth/subscription/usage policy → run business logic → return typed response.

## Definition of Done for architecture compliance
Use this checklist for all feature/fix PRs:

- [ ] Route/page files are thin and contain routing/composition only.
- [ ] UI components are presentational and do not embed business rules.
- [ ] Data fetching and state orchestration are implemented in hooks.
- [ ] Business logic is implemented in `lib` and reused where needed.
- [ ] External API/SDK/DB interactions are contained in `services`.
- [ ] Shared cross-layer contracts are defined/reused in `types`.
- [ ] API input validation and centralized auth/subscription/usage checks are present.
