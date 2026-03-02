# Services (`services/`)

## Scope
This folder is for **third-party integrations**.

### Allowed
- API clients and adapters for external providers.
- Auth/configuration wrappers around third-party SDKs.
- Integration-specific request/response shaping.

### Disallowed
- Product/business policy decisions (move to `lib/`).
- UI rendering and component logic (move to `components/`).
- Route handling/layout composition (move to `pages/`).

## Rule of thumb
Services isolate vendor details from the rest of the codebase.
