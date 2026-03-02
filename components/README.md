# Components (`components/`)

## Scope
This folder is for **presentational UI only**.

### Allowed
- Reusable UI components (buttons, cards, tables, banners, section shells).
- Styling and visual composition.
- Props-driven rendering logic.

### Disallowed
- Domain/business rules and decisions (move to `lib/`).
- Third-party integration clients (move to `services/`).
- Heavy data-fetching/state orchestration (move to `hooks/`).
- Route declarations and layout routing concerns (move to `pages/`).

## Rule of thumb
Components should remain easy to preview/test with mocked props.
