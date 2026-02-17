// lib/paywall/redirect.ts
export type Reason = 'plan_required'|'quota_limit'|'trial_ended'|'unknown';

export function buildPricingOverviewURL(opts: {
  reason: Reason;
  need?: string;
  from?: string;
  qk?: string;
}) {
  const usp = new URLSearchParams();
  usp.set('reason', opts.reason);
  if (opts.need) usp.set('need', opts.need);
  if (opts.from) usp.set('from', opts.from);
  if (opts.qk) usp.set('qk', opts.qk);
  return `/pricing/overview?${usp.toString()}`;
}