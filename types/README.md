# Types (`types/`)

## Scope
This folder is for **shared TypeScript contracts**.

### Allowed
- Reusable interfaces, type aliases, enums, and DTO contracts.
- Cross-layer type definitions used by routes, hooks, lib, and services.

### Disallowed
- Runtime business logic (move to `lib/`).
- Side-effecting integration code (move to `services/`).
- UI rendering logic (move to `components/`).

## Rule of thumb
Keep `types/` dependency-light so contracts can be imported everywhere.
