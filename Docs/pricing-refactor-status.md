# Pricing Refactoring Status

## Completed (March 15, 2026)

### Issue #3 – Standardize Pricing URLs

- All upgrade‑related links (dashboard, paywalls, banners, modals) now point to `/pricing/overview`.
- The main marketing page `/pricing` is reserved for new visitors / purchase intent.
- Query parameters (`ref`, `from`, etc.) are preserved where applicable.

### Issue #4 – Normalize Query Parameters

- Both `/pricing` and `/pricing/overview` now accept a unified set of parameters:
  - `reason` – why the user was redirected (e.g., `plan_required`, `quota_limit`)
  - `plan` – the target plan needed (`starter`, `booster`, `master`)
  - `returnTo` – where to send the user after purchase/upgrade
  - `ref` – tracking source (e.g., `footer`, `upgrade-modal`)
  - `code` – referral code
  - `qk` – quota key (for quota‑exceeded messages)
- Legacy parameters (`need`, `required`, `from`, `qk`) are still supported and mapped to the new ones.
- The unwanted banner that appeared on `/pricing` due to redirects has been removed.

### Code Quality

- Fixed React hook order in `PaywallGate.tsx` to satisfy ESLint rules.

---

## Remaining Work (Future Refactoring)

These items were identified in the original analysis but **not** addressed in this session. They are lower priority and can be tackled later as time permits.

| ID  | Issue                        | Description                                                                                                        | Priority |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | **Plan Identifiers**         | Unify `PlanId` (from `@/types/pricing`) and `PlanKey` (from `@/lib/pricing`). Both exist and cause type confusion. | Low      |
| 2   | **Centralize Pricing Data**  | Make `USD_PLAN_PRICES` private to `lib/pricing.ts` and ensure all price reads go through `getPlanPricing`.         | Medium   |
| 3   | **Unify Plan Display Names** | Replace all hardcoded plan names (e.g., "Booster") with calls to `getStandardPlanName`.                            | Medium   |
| 4   | **Consolidate URL Helpers**  | Create a single `buildPricingUrl` helper to replace scattered URL construction across the codebase.                | Low      |
| 5   | **Consolidate Type Imports** | Ensure all plan‑related types are imported only from `@/types/pricing`, not from `@/lib/pricing`.                  | Low      |
| 6   | **Derive `PLANS` Array**     | Generate the `PLANS` array dynamically from raw pricing data to avoid duplication.                                 | Low      |

---

## Next Steps

- Merge the current branch after review.
- Consider tackling the **medium‑priority** items (2 and 3) in a future sprint to improve maintainability.
- For now, the user‑facing inconsistencies are resolved.
