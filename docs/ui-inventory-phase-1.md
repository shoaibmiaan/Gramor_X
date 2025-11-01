# UI Inventory — Phase 1 Audit

_Updated: 2025-11-01_

This inventory captures the current surface area of shared UI elements prior to full design-system normalization. Decisions focus on converging toward a single canonical variant per component while mapping each to the new token-aware Tailwind classes.

![Canonical components — light](./ui-inventory/images/phase-1-canon-light.svg)
![Canonical components — dark](./ui-inventory/images/phase-1-canon-dark.svg)

## Buttons

| Variant     | Current Usage Notes                               | Decision                                 | Canonical DS Classes                                                                                                                                    | Screenshot                                           |
| ----------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Primary     | Gradient + solid variants with inconsistent radii | Merge into single solid tokenized button | `inline-flex items-center gap-xs rounded-ds-2xl px-md py-xs font-medium bg-accent text-bg-light focus-visible:ring-focus-ring`                          | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Secondary   | Ghost outline with custom opacity tweaks          | Keep as subdued outline                  | `inline-flex items-center gap-xs rounded-ds-2xl px-md py-xs font-medium border border-border text-text hover:bg-panel/60 focus-visible:ring-focus-ring` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Destructive | Red fill + text-red text button                   | Keep, align to `bg-bad` token            | `inline-flex items-center gap-xs rounded-ds-2xl px-md py-xs font-medium bg-bad text-bg-light focus-visible:ring-focus-ring`                             | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Ghost       | Numerous custom transparent buttons               | Merge with secondary ghost style         | `inline-flex items-center gap-xs rounded-ds-2xl px-md py-xs font-medium bg-transparent text-text hover:bg-panel/60 focus-visible:ring-focus-ring`       | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Inputs / Controls

| Control        | Current Usage Notes                                 | Decision                                    | Canonical DS Classes                                                                                                                                                          | Screenshot                                           |
| -------------- | --------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Text Input     | Mix of Tailwind + inline styles, inconsistent focus | Keep single variant                         | `w-full rounded-ds-xl border border-border bg-panel px-md text-text placeholder:text-muted/80 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Select         | Native + Radix styles diverge                       | Keep Radix-based styled select              | `w-full appearance-none rounded-ds-xl border border-border bg-panel px-md text-text focus-visible:ring-2 focus-visible:ring-focus-ring`                                       | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Textarea       | Custom heights + manual padding                     | Keep, align spacing tokens                  | `w-full min-h-[9.5rem] rounded-ds-xl border border-border bg-panel px-md py-sm text-text focus-visible:ring-2 focus-visible:ring-focus-ring`                                  | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Checkbox/Radio | Token work in progress                              | Merge to DS primitives from `design-system` | `inline-flex items-start gap-sm text-small text-text [&_input]:border-border [&_input]:rounded [&_input]:focus-visible:ring-focus-ring`                                       | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Cards & Surfaces

| Component       | Current Usage Notes                        | Decision                      | Canonical DS Classes                                                         | Screenshot                                           |
| --------------- | ------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| Card            | Multiple elevation stacks + inline padding | Keep single surface           | `bg-card text-text rounded-ds-2xl border border-border/60 shadow-sm p-lg`    | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Panel           | Background sections using gradients        | Normalize to panel token      | `bg-panel text-text rounded-ds-2xl border border-border/60 p-lg`             | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Table Container | Repeated borders + zebra stripes           | Keep subtle borderless layout | `bg-panel text-muted rounded-ds-2xl border border-border/70 overflow-x-auto` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Modals & Drawers

| Component | Current Usage Notes                     | Decision                | Canonical DS Classes                                                                                  | Screenshot                                           |
| --------- | --------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Modal     | Different paddings + backdrop opacities | Merge to DS modal       | `bg-card text-text rounded-ds-2xl border border-border shadow-2xl p-xl focus-visible:ring-focus-ring` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Drawer    | Slide-over uses inline width/padding    | Keep single width token | `bg-panel text-text w-[min(100vw,24rem)] rounded-ds-2xl border border-border/70 p-lg`                 | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Navigation & Tabs

| Component | Current Usage Notes                | Decision                 | Canonical DS Classes                                                                                                                | Screenshot                                           |
| --------- | ---------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Tabs      | Both underline + pill styles exist | Merge to pill tokens     | `inline-flex items-center gap-xs rounded-pill bg-panel/80 p-xs backdrop-blur`                                                       | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Tab Item  | Mixed text sizing + colors         | Keep focus ring + accent | `px-md py-xs rounded-pill text-muted data-[state=active]:bg-accent data-[state=active]:text-bg-light focus-visible:ring-focus-ring` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Chips & Badges

| Component   | Current Usage Notes                  | Decision                        | Canonical DS Classes                                                                                                     | Screenshot                                           |
| ----------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Badge       | Colors vary by inline hex            | Map to semantic tokens          | `inline-flex items-center gap-2xs rounded-pill px-sm py-xs bg-accent/15 text-accent ring-1 ring-accent/30`               | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Status Chip | Success/warning/danger using raw hex | Keep, map to ok/warn/bad tokens | `rounded-pill px-sm py-2xs text-small font-medium` with `bg-ok/15 text-ok`, `bg-warn/15 text-warn`, `bg-bad/15 text-bad` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Alerts & Toasts

| Component | Current Usage Notes               | Decision                     | Canonical DS Classes                                                                                                            | Screenshot                                           |
| --------- | --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Alert     | Uses inline background colors     | Merge to token classes       | `rounded-ds-xl border border-border/50 px-md py-sm shadow-sm` with tone-specific `bg-bad/15 text-bad`, `bg-ok/15 text-ok`, etc. | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Toast     | React-Toastify overrides with hex | Configure DS theme overrides | `bg-card text-text border border-border rounded-ds-2xl shadow-md px-lg py-sm`                                                   | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |

## Tables

| Component    | Current Usage Notes                 | Decision                               | Canonical DS Classes                                                                                                  | Screenshot                                           |
| ------------ | ----------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Table        | Alternating row styles across pages | Keep neutral zebra w/ tokens           | `w-full text-left text-small text-muted [&_th]:text-text [&_th]:font-semibold [&_tbody_tr]:border-t border-border/60` | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Table Header | Uppercase + tracking variants       | Keep subdued uppercase                 | `bg-panel/80 text-text uppercase tracking-wide`                                                                       | `phase-1-canon-light.svg` / `phase-1-canon-dark.svg` |
| Table Footer | Rare custom footers                 | Remove; consolidate into table caption | \_Remove\*                                                                                                            | _Pending — capture light/dark_                       |

## Next Steps

1. Publish light/dark canonical previews alongside the DS documentation (see embedded SVGs in this doc).
2. Replace ad-hoc layout utilities with spacing tokens (`px-lg`, `py-md`, etc.).
3. Promote canonical classnames into shared component wrappers (Phase 4 plan).
