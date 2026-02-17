// components/paywall/UsageCounterBadge.tsx
import * as React from 'react';
import { canUse, getCount, type UsageKey } from '@/lib/usage';
import { flags } from '@/lib/flags';
import { PLANS, type PlanId } from '@/types/pricing';
import type { QuotaKey } from '@/lib/plan/quotas';

export type UsageCounterBadgeProps = {
  usageKey: UsageKey;
  /** If planId+quotaKey are provided, limit is derived from the plan quota. */
  limit: number;
  className?: string;
  /** Refresh interval in ms; default 45s */
  refreshMs?: number;
  /** Label override (e.g., "AI checks") */
  label?: string;

  /** Optional: derive limit from plan quota instead of the `limit` prop. */
  planId?: PlanId;
  quotaKey?: QuotaKey; // 'dailyMocks' | 'aiEvaluationsPerDay' | 'storageGB'
};

function coerceLimit(value: unknown): number {
  if (value === 'unlimited') return Infinity;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function UsageCounterBadge({
  usageKey,
  limit,
  className,
  refreshMs = 45_000,
  label,
  planId,
  quotaKey,
}: UsageCounterBadgeProps) {
  const [count, setCount] = React.useState<number>(0);
  const [allowed, setAllowed] = React.useState<boolean>(true);

  // Derive limit from plan quota when possible; otherwise use prop `limit`.
  const derivedLimit = React.useMemo(() => {
    if (!planId || !quotaKey) return limit;
    const plan = PLANS[planId];
    const raw = (plan?.quota as Record<string, unknown> | undefined)?.[quotaKey];
    return coerceLimit(raw);
  }, [planId, quotaKey, limit]);

  async function refresh() {
    try {
      let used = 0;

      // If a quotaKey is specified, aggregate usage accordingly.
      if (planId && quotaKey) {
        if (quotaKey === 'aiEvaluationsPerDay') {
          // Sum writing + speaking AI evals
          const [w, s] = await Promise.all([
            getCount('ai.writing.grade'),
            getCount('ai.speaking.grade'),
          ]);
          used = (w ?? 0) + (s ?? 0);
        } else if (quotaKey === 'dailyMocks') {
          used = (await getCount('mock.start')) ?? 0;
        } else {
          // For quotas not tied to counters here, fall back to the single key counter.
          const res = await canUse(usageKey, Number.isFinite(derivedLimit) ? derivedLimit : Number.MAX_SAFE_INTEGER);
          used = res.count;
        }
        const allowedNow = derivedLimit === Infinity ? true : used < derivedLimit;
        setCount(used);
        setAllowed(allowedNow);
        return;
      }

      // Fallback: original single-key behaviour using provided `limit`.
      const res = await canUse(usageKey, limit);
      setCount(res.count);
      setAllowed(res.allowed);
    } catch {
      // ignore network errors; keep last known
    }
  }

  React.useEffect(() => {
    if (!flags.enabled('paywall')) return; // badge meaningless without paywall
    refresh();
    const id = setInterval(refresh, refreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageKey, limit, refreshMs, planId, quotaKey, derivedLimit]);

  if (!flags.enabled('paywall')) return null;

  const isUnlimited = derivedLimit === Infinity;
  const denom = isUnlimited ? '∞' : derivedLimit;

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-caption font-medium',
        allowed ? 'text-foreground' : 'text-error',
        className || '',
      ].join(' ')}
      title={`${count} of ${isUnlimited ? 'Unlimited' : denom} used today`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: allowed ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
      />
      {label ?? 'Today'}: {count}/{denom}
    </span>
  );
}
