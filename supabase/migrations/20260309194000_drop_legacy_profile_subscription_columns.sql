-- Stage 2: Remove legacy profile subscription columns after migration freeze.
-- Run only after all application reads/writes are moved to public.subscriptions.

alter table public.profiles
  drop column if exists membership,
  drop column if exists plan_id,
  drop column if exists subscription_status,
  drop column if exists subscription_renews_at,
  drop column if exists trial_ends_at,
  drop column if exists premium_until;
