// components/paywall/PaywallGate.tsx
import * as React from 'react';
import Link from 'next/link';

import { flags } from '@/lib/flags';
import { routes } from '@/lib/routes';
import { canUse, type UsageKey } from '@/lib/usage';
import { getPlan, type PlanId } from '@/types/pricing';
import { Button } from '@/components/design-system/Button';
import { emitUpgradePrompt } from '@/components/premium/UpgradeModal';

type Feature =
  | 'mock'
  | 'ai.writing'
  | 'ai.speaking'
  | 'ai.explain';

const usageKeyMap = {
  mock: 'mock.start',
  'ai.writing': 'ai.writing.grade',
  'ai.speaking': 'ai.speaking.grade',
  'ai.explain': 'ai.explain',
} as const satisfies Record<Feature, UsageKey>;

const featureCopy: Record<Feature, { title: string; description: string }> = {
  mock: {
    title: 'mock exams',
    description: 'Premium unlocks unlimited mock exam starts with pacing analytics.',
  },
  'ai.writing': {
    title: 'AI writing feedback',
    description: 'Upgrade for deeper Task 1 & 2 coaching, grammar breakdowns, and vocab boosts.',
  },
  'ai.speaking': {
    title: 'AI speaking feedback',
    description: 'Premium gives you full speaking evaluations with filler tracking and fluency tips.',
  },
  'ai.explain': {
    title: 'AI explanations',
    description: 'Upgrade for unlimited “why is this answer correct?” explanations and strategy nudges.',
  },
};

function limitFor(feature: Feature, planId: PlanId) {
  const plan = getPlan(planId);
  if (feature === 'mock') return plan.quota.dailyMocks;
  return plan.quota.aiEvaluationsPerDay;
}

export type PaywallGateProps = {
  feature: Feature;
  planId?: PlanId; // default 'free'
  /** If provided, overrides plan-based limit */
  limitOverride?: number;
  children: React.ReactNode;
  /** Custom fallback when blocked */
  fallback?: React.ReactNode;
  /** Called once when blocked is detected */
  onBlocked?: () => void;
  /** Optional className wrapper */
  className?: string;
};

/**
 * Wrap any action area that should be rate-limited on free plans.
 * It checks the current count (step=0) and decides to show children or a paywall prompt.
 */
export function PaywallGate({
  feature,
  planId = 'free',
  limitOverride,
  children,
  fallback,
  onBlocked,
  className,
}: PaywallGateProps) {
  const [allowed, setAllowed] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [count, setCount] = React.useState<number>(0);
  const [limit, setLimit] = React.useState<number>(limitOverride ?? limitFor(feature, planId));
  const promptSentRef = React.useRef(false);

  React.useEffect(() => {
    let mounted = true;

    async function run() {
      if (!flags.enabled('paywall')) {
        if (!mounted) return;
        setAllowed(true);
        setLoading(false);
        return;
      }

      const key = usageKeyMap[feature];
      const lim = limitOverride ?? limitFor(feature, planId);

      try {
        const res = await canUse(key, lim);
        if (!mounted) return;
        setCount(res.count);
        setLimit(lim);
        setAllowed(res.allowed);
        setLoading(false);
        if (!res.allowed) onBlocked?.();
      } catch {
        if (!mounted) return;
        // Be permissive on error to avoid false blocks
        setAllowed(true);
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [feature, planId, limitOverride, onBlocked]);

  if (loading) {
    return (
      <div className={className}>
        <div className="rounded-2xl border border-border bg-card text-foreground p-4 animate-pulse-soft">
          <div className="h-4 w-28 bg-foreground/10 rounded mb-2" />
          <div className="h-3 w-40 bg-foreground/10 rounded" />
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    if (loading) return;
    if (!allowed) {
      if (!promptSentRef.current) {
        const copy = featureCopy[feature];
        emitUpgradePrompt({ feature: copy ? copy.title : undefined });
        promptSentRef.current = true;
      }
    } else {
      promptSentRef.current = false;
    }
  }, [allowed, feature, loading]);

  if (allowed) return <>{children}</>;

  if (fallback) return <div className={className}>{fallback}</div>;

  const copy = featureCopy[feature];
  const featureTitle = copy?.title ?? 'this premium feature';

  return (
    <div className={className}>
      <div className="rounded-2xl border border-border bg-card p-5 text-foreground shadow-card">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-body font-semibold">Upgrade to continue</h3>
              <p className="mt-1 text-small text-muted-foreground">
                {copy?.description ?? 'Premium removes the daily limit so you can keep going without interruption.'}
              </p>
              <p className="text-caption text-muted-foreground">
                Used {count} of {limit}{' '}
                {feature.startsWith('ai') ? 'free AI evaluations' : 'free mock starts'} today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => emitUpgradePrompt({ feature: featureTitle })}
                elevateOnHover
              >
                View upgrade options
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`${routes.pricing()}?from=paywall`}>Go to pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
