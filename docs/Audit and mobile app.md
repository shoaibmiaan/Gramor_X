# Audit & Mobile App — Phase 1 Wrap-Up

_Last updated: 2025-11-02_

## Phase-1 UI Parity Checklist

- [x] Canonical design tokens published in `design-system/tokens.json` (colors, spacing, radii, shadows, fonts)
- [x] Tailwind theme wired to consume tokens for shared color/spacing primitives
- [x] Prettier + Stylelint guards enforce token usage and forbid raw hex values in app code
- [x] Buttons, Inputs, Cards, Modals, Tabs, Chips, Alerts, Tables normalized to a single DS variant each
- [x] UI inventory report refreshed with canonical previews (light & dark)
- [x] Hex scan + design-system lint scripts promoted via npm (`npm run ds:scan-hex`, `npm run lint:styles`)
- [x] Premium reading/listening flows updated to avoid inline hex fallbacks

## Token Snapshot

| Token Group    | Keys                                       | Sample Value                                                    |
| -------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `color.bg`     | `default`, `light`                         | `hsl(222, 47%, 11%)`, `hsl(0, 0%, 100%)`                        |
| `color.text`   | `default`, `muted`                         | `hsl(210, 20%, 98%)`, `hsl(215, 16%, 65%)`                      |
| `color.accent` | `primary`, `secondary`                     | `hsl(262, 83%, 58%)`, `hsl(188, 92%, 54%)`                      |
| `color.status` | `ok`, `warn`, `bad`                        | `hsl(142, 71%, 45%)`, `hsl(38, 92%, 50%)`, `hsl(0, 84%, 60%)`   |
| `radius`       | `sm`, `md`, `lg`, `xl`, `pill`             | `0.25rem → 9999px`                                              |
| `spacing`      | `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` | `0.125rem → 2rem`                                               |
| `shadow`       | `sm`, `md`                                 | `0 1px 2px 0 rgb(0 0 0 / 0.05)`, `0 4px 12px rgb(0 0 0 / 0.15)` |
| `font`         | `sans`, `mono`                             | System sans & mono fallbacks aligned with DS                    |

## Mobile App Parity Notes

- Token palette aligns with the mobile foundation palette; gradients map to `accent`/`accent2` to avoid bespoke hex values.
- Shared focus states (accent ring) applied to canonical touch targets — parity with mobile focus overlays confirmed.
- Premium exam flows now rely on CSS variables with HSL fallbacks, matching the mobile reading/listening palette.

## Known Follow-Ups (Phase 2/3 Candidates)

1. **Storybook coverage** — promote canonical components into storybook entries + Chromatic snapshots (Phase 2).
2. **Theming runtime** — expose dark/light token toggles via context for runtime switching (Phase 2).
3. **Motion + micro-interactions** — align hover/press interactions with mobile animations (Phase 3).
4. **Accessibility sweeps** — integrate axe/Lighthouse CI once token migration stabilizes (Phase 3).
5. **Supabase client guardrails** — audit remaining UI modules for client instantiation (tracked for platform parity).
