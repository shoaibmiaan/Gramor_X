# Architecture Baseline

## Routing baseline
The repository currently uses the **Pages Router** as the primary routing system via the root-level `pages/` directory.

- `pages/` is the active route boundary and should contain routing/layout composition only.
- `app/` is not currently present at repo root.

If `app/` is introduced in the future, this document must be updated with a single declared primary router and migration plan.

## Layer constraints
- **routes (`pages/` or `app/`)**: routing/layout only.
- **components/**: presentational UI only.
- **hooks/**: fetching/state orchestration.
- **lib/**: domain/business logic.
- **services/**: third-party integrations.
- **types/**: shared TypeScript contracts.
