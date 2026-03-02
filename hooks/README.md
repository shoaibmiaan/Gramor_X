# Hooks (`hooks/`)

## Scope
This folder is for **fetching and state orchestration**.

### Allowed
- Custom hooks that fetch or mutate data.
- Local and shared state orchestration for features.
- Glue code that composes services + lib helpers for UI consumption.

### Disallowed
- UI markup/presentational rendering (move to `components/`).
- Pure domain logic that has no React concerns (move to `lib/`).
- Direct route declarations (move to `pages/`).

## Rule of thumb
Hooks should expose a clean interface for UI components and hide orchestration details.
