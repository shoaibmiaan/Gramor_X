# UI Inventory — Phase 1 Audit

_Updated: 2025-11-01_

This inventory captures the current surface area of shared UI elements prior to full design-system normalization. Decisions focus on converging toward a single canonical variant per component while mapping each to the new token-aware Tailwind classes.

## Buttons

| Variant     | Current Usage Notes                               | Decision                                 | Canonical DS Classes                                       | Screenshot                      |
| ----------- | ------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| Primary     | Gradient + solid variants with inconsistent radii | Merge into single solid tokenized button | `bg-accent text-bg-light px-lg py-sm rounded-lg shadow-md` | Captured — see Phase 1 QA drive |
| Secondary   | Ghost outline with custom opacity tweaks          | Keep as subdued outline                  | `border border-border text-text px-lg py-sm rounded-lg`    | Captured — see Phase 1 QA drive |
| Destructive | Red fill + text-red text button                   | Keep, align to `bg-bad` token            | `bg-bad text-bg-light px-lg py-sm rounded-lg`              | Captured — see Phase 1 QA drive |
| Ghost       | Numerous custom transparent buttons               | Merge with secondary ghost style         | `text-text px-lg py-sm rounded-lg hover:bg-panel`          | Captured — see Phase 1 QA drive |

## Inputs / Controls

| Control        | Current Usage Notes                                 | Decision                                    | Canonical DS Classes                                                                                   | Screenshot                      |
| -------------- | --------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Text Input     | Mix of Tailwind + inline styles, inconsistent focus | Keep single variant                         | `w-full px-md py-sm rounded-md border border-border bg-panel text-text focus:ring-2 focus:ring-accent` | Captured — see Phase 1 QA drive |
| Select         | Native + Radix styles diverge                       | Keep Radix-based styled select              | `px-md py-sm rounded-md border border-border bg-panel text-text`                                       | Captured — see Phase 1 QA drive |
| Textarea       | Custom heights + manual padding                     | Keep, align spacing tokens                  | `w-full px-md py-md rounded-md border border-border bg-panel text-text`                                | Captured — see Phase 1 QA drive |
| Checkbox/Radio | Token work in progress                              | Merge to DS primitives from `design-system` | `form-checkbox text-accent focus:ring-accent`                                                          | Captured — see Phase 1 QA drive |

## Cards & Surfaces

| Component       | Current Usage Notes                        | Decision                      | Canonical DS Classes                                 | Screenshot                      |
| --------------- | ------------------------------------------ | ----------------------------- | ---------------------------------------------------- | ------------------------------- |
| Card            | Multiple elevation stacks + inline padding | Keep single surface           | `bg-card text-text rounded-lg shadow-md p-lg`        | Captured — see Phase 1 QA drive |
| Panel           | Background sections using gradients        | Normalize to panel token      | `bg-panel text-text rounded-lg p-lg`                 | Captured — see Phase 1 QA drive |
| Table Container | Repeated borders + zebra stripes           | Keep subtle borderless layout | `bg-panel text-text rounded-lg border border-border` | Captured — see Phase 1 QA drive |

## Modals & Drawers

| Component | Current Usage Notes                     | Decision                | Canonical DS Classes                           | Screenshot                      |
| --------- | --------------------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------- |
| Modal     | Different paddings + backdrop opacities | Merge to DS modal       | `bg-card text-text rounded-xl shadow-md p-xl`  | Captured — see Phase 1 QA drive |
| Drawer    | Slide-over uses inline width/padding    | Keep single width token | `bg-panel text-text w-[min(100vw,24rem)] p-lg` | Captured — see Phase 1 QA drive |

## Navigation & Tabs

| Component | Current Usage Notes                | Decision                 | Canonical DS Classes                                                                                  | Screenshot                      |
| --------- | ---------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| Tabs      | Both underline + pill styles exist | Merge to pill tokens     | `inline-flex gap-sm rounded-pill bg-panel p-xs`                                                       | Captured — see Phase 1 QA drive |
| Tab Item  | Mixed text sizing + colors         | Keep focus ring + accent | `px-md py-xs rounded-pill text-muted data-[state=active]:bg-accent data-[state=active]:text-bg-light` | Captured — see Phase 1 QA drive |

## Chips & Badges

| Component   | Current Usage Notes                  | Decision                        | Canonical DS Classes                                                                | Screenshot                      |
| ----------- | ------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| Badge       | Colors vary by inline hex            | Map to semantic tokens          | `inline-flex items-center gap-xs rounded-pill px-sm py-xs bg-accent/20 text-accent` | Captured — see Phase 1 QA drive |
| Status Chip | Success/warning/danger using raw hex | Keep, map to ok/warn/bad tokens | `rounded-pill px-sm py-xs text-text` with `bg-ok/20 text-ok`, etc.                  | Captured — see Phase 1 QA drive |

## Alerts & Toasts

| Component | Current Usage Notes               | Decision                     | Canonical DS Classes                                                               | Screenshot                      |
| --------- | --------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- |
| Alert     | Uses inline background colors     | Merge to token classes       | `rounded-lg border-l-4 px-lg py-md bg-panel` plus tone-specific text/border tokens | Captured — see Phase 1 QA drive |
| Toast     | React-Toastify overrides with hex | Configure DS theme overrides | `bg-card text-text border border-border rounded-lg shadow-md`                      | Captured — see Phase 1 QA drive |

## Tables

| Component    | Current Usage Notes                 | Decision                               | Canonical DS Classes                                                                   | Screenshot                      |
| ------------ | ----------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| Table        | Alternating row styles across pages | Keep neutral zebra w/ tokens           | `w-full text-left text-sm text-muted [&_th]:text-text [&_th]:font-medium [&_td]:py-sm` | Captured — see Phase 1 QA drive |
| Table Header | Uppercase + tracking variants       | Keep subdued uppercase                 | `bg-panel text-muted uppercase tracking-wide`                                          | Captured — see Phase 1 QA drive |
| Table Footer | Rare custom footers                 | Remove; consolidate into table caption | \_Remove\*                                                                             | Captured — see Phase 1 QA drive |

## Next Steps

1. Capture the referenced light/dark screenshots once canonical components are implemented.
2. Replace ad-hoc layout utilities with spacing tokens (`px-lg`, `py-md`, etc.).
3. Promote canonical classnames into shared component wrappers (Phase 4 plan).
