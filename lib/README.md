# Domain Library (`lib/`)

## Scope
This folder is for **domain and business logic**.

### Allowed
- Business rules, calculations, policy checks, and domain transformations.
- Framework-agnostic helpers used across features.
- Validation and mapping logic tied to product behavior.

### Disallowed
- JSX/visual components (move to `components/`).
- Route/layout definitions (move to `pages/`).
- Third-party client wiring (move to `services/`).

## Rule of thumb
`lib/` code should be portable and testable without rendering UI.
