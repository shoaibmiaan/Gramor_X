# Phase 2 Stripe Webhook Audit

## Current handler

- Endpoint: `pages/api/webhooks/payment.ts` (proxied from `pages/api/billing/stripe-webhook.ts`).
- Signature verification: implemented with `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`.
- Idempotency: basic duplicate gate via `payment_events` (`provider + external_id`).

## Events handled

- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Gaps found and fixes applied

1. **Source-of-truth mismatch**
   - Before: webhook updated `profiles` legacy subscription fields.
   - After: webhook upserts/updates `subscriptions` table fields.

2. **Customer mapping lookup**
   - Before: invoice/customer lookups queried `profiles.stripe_customer_id`.
   - After: lookups query `subscriptions.stripe_customer_id`.

3. **Lifecycle sync location**
   - Before: status transitions were synced back to `profiles`.
   - After: transitions sync to `subscriptions.status/plan_id/current_period_end`.

## Remaining enhancements

- Add explicit handlers for:
  - `customer.subscription.created`
  - `customer.subscription.trial_will_end`
- Add first-class `audit_logs` inserts for each subscription change event.
- Enforce stronger idempotency key strategy by event type + object id where needed.
