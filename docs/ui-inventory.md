# UI Component Inventory (Phase 12.1.1)

Generated from codebase scan of `.tsx/.jsx` files in `components/`, `pages/`, and `layouts/`.

## Inventory method

- `node scripts/ui-audit-inventory.mjs`
- `python` spot-check for component naming patterns in `components/**/*.tsx` and `pages/**/*.tsx`
- Manual sampling for variants and behavior differences

Raw machine-readable output:
- `docs/baseline/ui-component-inventory.json`

## Totals (filename-driven categorization)

| Type | Count |
| --- | ---: |
| Button | 9 |
| Card | 30 |
| Input | 2 |
| Modal/Dialog | 14 |
| Table | 3 |
| Badge | 4 |
| Alert/Toast | 4 |
| Tabs | 2 |
| Dropdown/Menu | 4 |
| Layout | 27 |
| Navigation | 7 |
| Skeleton | 5 |
| EmptyState | 2 |
| Other UI/page files | 679 |

## High-impact duplicate implementations

### Buttons

- `components/design-system/Button.tsx` (token-driven, polymorphic, loading state, icon support)
- `components/ui/Button.tsx` (separate API + visual language)
- Additional bespoke action buttons exist in feature folders:
  - `components/quick/QuickDrillButton.tsx`
  - `components/listening/SaveButton.tsx`
  - `components/writing/ExportButton.tsx`

**Observation:** There are at least two foundational Button primitives in active use with different variants, radius, and focus treatment.

### Cards

- Shared core cards:
  - `components/design-system/Card.tsx`
  - `components/dashboard/DashboardCard.tsx`
- Numerous custom card implementations across domains (challenge, reading, innovation, referrals, etc.)

**Observation:** Card spacing and elevation styles vary by domain; unified `Card` usage is incomplete.

### Modals

- Generalized modal:
  - `components/design-system/Modal.tsx`
- Domain-specific modals across listening, dashboard, premium, quiz, teacher, and dashboard widgets.

**Observation:** Modal behavior and close affordances are implemented multiple times, increasing consistency risk.

### Skeletons and empty states

- Skeleton implementations:
  - `components/common/Skeleton.tsx`
  - `components/design-system/Skeleton.tsx`
  - `components/ui/Skeleton.tsx`
  - `components/loading/Skeletons.tsx`
- Empty states:
  - `components/design-system/EmptyState.tsx`
  - `components/study/EmptyState.tsx`

**Observation:** Loading and empty state primitives are already duplicated and can be consolidated quickly.

## Recommended consolidation order

1. **Button** (highest leverage): pick one canonical primitive and migrate variants via props.
2. **Skeleton + EmptyState**: standardize loading/empty UX globally.
3. **Modal**: enforce one focus + escape + close behavior contract.
4. **Card**: align spacing/radius/shadow tokens.

