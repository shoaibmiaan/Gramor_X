# Accessibility Quick Scan (Phase 12.1.4)

## Method used in this pass

Because this pass is codebase-first and environment-constrained, the scan combines:
- static pattern detection (`rg`) for accessibility risk indicators
- manual sampling of key interactive components

## Key observations

## 1) Focus visibility: partially strong, partially ad hoc

- Many components correctly use `focus-visible:ring-*` patterns.
- Some controls still rely on local focus styles (`focus:outline-none` + custom classes) with inconsistent token usage.

**Risk:** Focus affordance consistency can regress, especially in feature-level components.

## 2) Accessible naming for icon/action buttons requires targeted cleanup

- Static search identified many `<button>` occurrences where accessible naming needs verification.
- Several components already include `aria-label` (good), but coverage is uneven.

**Risk:** Screen-reader discoverability may vary for icon-only actions.

## 3) Loading/announcement semantics are not uniformly explicit

- Loading is implemented in many places; only some controls expose `aria-busy` or status semantics.

**Risk:** Non-visual users may miss context during async updates.

## 4) Form labeling consistency needs a structured pass

- Inputs are implemented across many page domains, often with custom wrappers.

**Risk:** Potential label association gaps and inconsistent error announcement behavior.

## Prioritized fix list (Phase 12)

### P0
1. Standardize icon-button a11y contract (`aria-label` required when no visible text).
2. Enforce visible focus indicator contract for all interactive primitives.

### P1
3. Add `role="status"`/`aria-live` guidance for async toast/loading/result updates.
4. Verify form labels + error associations in onboarding, auth, and checkout flows.

### P2
5. Add automated route-level axe checks for 5–10 representative pages in CI.

