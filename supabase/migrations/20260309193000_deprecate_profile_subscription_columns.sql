-- Stage 1: Mark legacy profile subscription columns as deprecated.
-- These columns are now served via compatibility mapping in lib/subscription.ts
-- and should not be used for new reads.

comment on column public.profiles.membership is
  'DEPRECATED: subscription plan should be read from public.subscriptions latest row.';
comment on column public.profiles.plan_id is
  'DEPRECATED: canonical subscription plan is public.subscriptions.plan_id.';
comment on column public.profiles.subscription_status is
  'DEPRECATED: canonical status is public.subscriptions.status.';
comment on column public.profiles.subscription_renews_at is
  'DEPRECATED: canonical renewal timestamp is public.subscriptions.current_period_end.';
comment on column public.profiles.trial_ends_at is
  'DEPRECATED: canonical trial timestamp is public.subscriptions.trial_end.';
comment on column public.profiles.premium_until is
  'DEPRECATED: no longer canonical; use subscription lifecycle in public.subscriptions.';
