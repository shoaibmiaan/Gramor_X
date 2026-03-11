# Routing status policy

This document defines how route readiness is governed across the product.

## Status manifest

Route/component status is tracked in `lib/routing/routeStatusManifest.ts` with these states:

- `done`: live and protected from casual edits.
- `partial`: live, but still has scoped fallback/copy placeholders.
- `incomplete`: not launched; must use placeholder experience.

The manifest is the source of truth and includes route path, component path, status summary, CTA metadata, and optional lock metadata.

## Detection process

When scanning for user-visible placeholder strings (for example, “coming soon”), map each affected route/component to one of:

- `done` when the route is functionally complete and placeholder text is only for a minor sub-feature.
- `partial` when the route is available but can render launch-gating or substantial fallback states.
- `incomplete` when route-level feature delivery is not complete.

## Rules for `incomplete` routes

`incomplete` routes must follow all of the below:

1. Route through shared placeholder wrapper (`components/routing/IncompleteRoutePlaceholder.tsx`).
2. Exclude from sitemap via `isSitemapEligible` in `lib/routing/governance.ts`.
3. Exclude from primary navigation via `isPrimaryNavEligible` in nav filtering.
4. Include a consistent CTA (waitlist, notify-me equivalent, or fallback path).

## Rules for `done` routes

`done` routes must follow all of the below:

1. Include `lock` annotation in `routeStatusManifest`.
2. Be listed in `.github/CODEOWNERS` for explicit reviewer ownership.
3. Be protected by CI (`scripts/ci/enforce-route-locks.mjs`) that fails edits unless `ROUTE_LOCK_OVERRIDE=true` is supplied after owner approval.

## Operational notes

- Navigation filtering is centralized in `lib/navigation/utils.ts`.
- Utility helpers are in `lib/routing/governance.ts`.
- New routes should be added to the manifest as part of route creation, not after launch.
