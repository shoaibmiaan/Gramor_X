# Visual Consistency Audit (Phase 12.1.2)

## Scope sampled

Representative surface areas reviewed from code and component structure:
- Marketing/public pages (`/`, `/pricing`, auth pages)
- Dashboard and challenge surfaces
- Onboarding flows
- Navigation systems (desktop + mobile)

## Findings

## 1) Two visual languages coexist for foundational components

- `components/design-system/Button.tsx` uses DS tokens (`rounded-2xl`, tokenized tones).
- `components/ui/Button.tsx` uses a different style base (`rounded-xl`, indigo/slate palette).

**Result:** Buttons can look different between routes even when semantically equivalent.

## 2) Typography tokens are mixed

Frequent classes include both semantic tokens and utility size tokens (e.g., `text-small`, `text-body`, `text-h3` together with `text-sm`, `text-xs`, `text-lg`).

**Result:** Visual rhythm and hierarchy can drift page-to-page.

## 3) Spacing scales show broad variation

Top spacing utilities are concentrated around `p-4`, `py-2`, `p-6`, `px-3`, but many adjacent alternatives are also heavily used.

**Result:** Near-duplicate spacing choices produce subtle inconsistency.

## 4) Layout wrappers are abundant

There are 27 `*Layout*` files under active code paths.

**Result:** Page shell behavior (max width, gutters, section spacing) likely varies unless enforced by a shared wrapper contract.

## Immediate recommendations

1. Freeze canonical visual primitives (Button, Card, Input, Modal, Badge).
2. Define a constrained typography and spacing scale for application UI surfaces.
3. Introduce a layout conformance checklist for new/updated pages.
4. Use Storybook as the visual source of truth for component variants.

