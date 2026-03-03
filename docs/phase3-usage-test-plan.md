# Phase 3 Manual Test Plan (AI Usage & Cost Protection)

## Core scenarios

1. **Free user limit enforcement**
   - Call `/api/ai/explain` repeatedly until quota exceeded.
   - Expected: API responds `429` with `usage_limit_reached` once daily feature quota is consumed.

2. **Paid user higher limits**
   - For starter/booster/master test users, call `/api/ai/summary` repeatedly.
   - Expected: higher request ceilings than free plan before `429` is returned.

3. **Usage meter visibility**
   - Open `/dashboard/billing`.
   - Expected: usage meters render for `ai.explain`, `ai.summary`, and `ai.writing.score` with used/limit bars.

4. **Daily usage rollover**
   - Verify that requests are bucketed by UTC date (`usage_tracking.date`).
   - Expected: new day starts with fresh counters.

5. **Admin usage monitoring**
   - Call `/api/admin/ai/usage-summary` as admin.
   - Expected: aggregated requests by feature returned for selected date range.

## Webhook/API interactions

- Confirm Stripe and subscription plan synchronization affects effective usage limits.
- Confirm AI endpoints now record and enforce usage through `guardAIRequest`.

## Tables to verify

- `usage_tracking`
- `subscriptions`

