# Phase 2 Subscription Audit

## Legacy subscription fields in `profiles`

The following profile fields were being used as a parallel subscription source and are now considered legacy:

- `membership`
- `plan`
- `tier`
- `subscription_status`
- `subscription_expires_at`
- `premium_until`
- `stripe_customer_id`

## Direct legacy usage found in code

- `hooks/useSubscription.ts` previously read `profile.subscription_status`, `profile.premium_until`, `profile.stripe_customer_id`.
- `pages/api/billing/summary.ts` previously loaded `stripe_customer_id`, `plan_id`, and `premium_until` from `profiles`.
- `pages/api/webhooks/payment.ts` previously updated `profiles` for Stripe subscription lifecycle events.

## Direct `subscriptions` queries found

- `lib/repositories/subscriptionRepository.ts`
- `lib/repositories/profileRepository.ts`
- `pages/api/admin/users.ts`
- `pages/api/subscriptions/portal.ts`

These are valid server-side query points and should remain the primary source, but business checks should be routed through `lib/subscription.ts` helpers.

## Other subscription-like storage

- `payment_intents` and `pending_payments` contain payment flow state, not entitlement source-of-truth.
- `plans` contains pricing/feature metadata and is referenced by subscriptions.

## Migration plan summary

1. Extend/normalize `public.subscriptions` schema to include Stripe identifiers and period fields.
2. Add indexes and owner RLS policies on `subscriptions`.
3. Drop legacy subscription fields from `profiles` after data backfill.
4. Route billing/webhook/hook reads through `subscriptions` and `lib/subscription.ts`.

## Rollback considerations

- Restore dropped `profiles` columns from backup migration if needed.
- Keep `subscriptions` data untouched to avoid Stripe state loss.
