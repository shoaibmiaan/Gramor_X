# Performance Best Practices (Phase 6)

This document defines the baseline performance standards for GramorX.

## 1) Data Fetching
- Use SWR for all client reads.
- Prefer shared keys and deduping to prevent duplicate requests.
- Parallelize independent requests with `Promise.all`.
- Avoid fetch waterfalls in page-level effects.

## 2) Caching
- Keep global SWR defaults in `_app`.
- Use optimistic UI for latency-sensitive mutations.
- Revalidate only where data freshness truly matters.

## 3) Pagination
- Never render unbounded lists.
- Require API-level pagination for list endpoints.
- Use shared pagination component for consistency and accessibility.

## 4) Code Splitting & Lazy Loading
- Dynamically import heavy/optional modules (charts, AI panels, rich editors).
- Route-level code splitting is not enough for large dashboard screens.
- Always provide loading fallback for dynamic imports.

## 5) Assets
- Prefer `next/image` over raw `<img>`.
- Define image sizes to avoid layout shifts.
- Keep SVG/icon bundles tree-shakeable.

## 6) Rendering
- Use virtualization (`react-window`) for very large lists.
- Prevent unnecessary rerenders with memoization where measurable.
- Prefer skeletons over blocking spinners for content regions.

## 7) Monitoring
- Keep Lighthouse CI in pull-request checks.
- Capture Core Web Vitals via `reportWebVitals` and ingest on backend.
- Track regressions trend over time rather than one-off snapshots.

## 8) Performance budgets
- Performance score target: **>= 90** for top user paths.
- LCP target: **<= 2.5s** (mobile).
- TBT target: **<= 300ms**.
- CLS target: **<= 0.1**.

## 9) PR checklist (required)
- [ ] No new unpaginated list endpoint.
- [ ] No new heavy dependency without justification.
- [ ] Dynamic import used for large non-critical components.
- [ ] Lighthouse/CI checks pass for impacted routes.
