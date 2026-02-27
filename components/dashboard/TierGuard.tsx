import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { hasFeatureAccess, tierRank } from '@/lib/dashboard/featureFlags';
import type { DashboardFeatureKey, SubscriptionTier } from '@/types/dashboard';
import { Button } from '@/components/ui/Button';
import { UpgradeModal } from '@/components/dashboard/UpgradeModal';

type TierGuardProps = PropsWithChildren<{
  tier: SubscriptionTier;
  feature: DashboardFeatureKey;
  minimumTier?: SubscriptionTier;
}>;

export function TierGuard({ children, tier, feature, minimumTier = 'rocket' }: TierGuardProps) {
  const [open, setOpen] = useState(false);

  if (hasFeatureAccess(tier, feature)) {
    return <>{children}</>;
  }

  const canUpgrade = tierRank[tier] < tierRank[minimumTier];

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">Upgrade to unlock this feature.</p>
      <div className="mt-3">
        <Button onClick={() => setOpen(true)} disabled={!canUpgrade}>
          Upgrade plan
        </Button>
      </div>
      <UpgradeModal open={open} onClose={() => setOpen(false)} requiredTier={minimumTier} />
    </div>
  );
}
