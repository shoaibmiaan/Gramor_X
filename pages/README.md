# Routes (`pages/`)

## Scope
This folder is for **routing and layout wiring only**.

### Allowed
- Route files that map URLs to screens.
- Next.js page-level wrappers and layout composition.
- Route-level metadata and lightweight guards that delegate business decisions.

### Disallowed
- Core domain/business logic.
- Direct third-party SDK integration code.
- Reusable presentational components (place them in `components/`).
- Shared data-fetching/state orchestration hooks (place them in `hooks/`).

## Rule of thumb
If code can be reused outside a single route, move it out of `pages/`.
