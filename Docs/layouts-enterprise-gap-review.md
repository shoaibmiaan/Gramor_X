# Layout System Gap Review (GramorX vs Enterprise Baseline)

## Scope reviewed
- `components/layouts/*`
- `components/layouts/AppLayoutManager.tsx`
- `_app` handoff to layout manager.

## Key gap found

### 1) Layout ownership and routing precedence were fragmented
In an enterprise-grade shell system, the component that owns layout composition should also own:
- route-to-layout mapping,
- precedence of specialized layouts over generic ones,
- and coherent section-level navigation.

Previously, GramorX had these gaps:
- Billing layout implementation was effectively a duplicated Support layout file, with wrong semantic content and exports.
- Billing-like pages (`/settings/billing`, `/dashboard/billing`, `/profile/subscription`) were not consistently routed to a billing-specific shell.
- Generic dashboard matching could overshadow specialized shells.

## Improvements made in this change

1. Rebuilt `BillingLayout` into a proper billing/subscription shell with billing-specific navigation and copy.
2. Updated `AppLayoutManager` precedence so specialized layouts (billing/profile/support/analytics/etc.) are evaluated before generic dashboard.
3. Expanded billing route matching to include billing pages currently spread across dashboard/profile/settings namespaces.
4. Refined dashboard route grouping to avoid stealing profile/settings routes.

## Remaining enterprise opportunities (next steps)

- **Typed route registry**: move hard-coded prefixes into a typed route-layout registry with tests to detect overlap and dead routes.
- **Layout contract tests**: add tests ensuring critical route families resolve to expected layouts.
- **Design-token parity**: normalize spacing/heading conventions across all layouts via shared shell primitives.
- **A11y consistency**: standardize landmark roles, `aria-current`, and keyboard tab behavior for all sub-navs.
- **Observability hooks**: add layout-resolution telemetry for debugging cross-page shell inconsistencies.
