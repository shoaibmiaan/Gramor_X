import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { EntitlementFeatureKey } from '@/lib/config/featureFlags';
import type { SubscriptionTier } from '@/lib/navigation/types';
import useEntitlement from '@/hooks/useEntitlement';
import { Button } from '@/components/ui/Button';
import { UpgradeModal } from '@/components/dashboard/UpgradeModal';

type TierGuardProps = PropsWithChildren<{
  tier: SubscriptionTier;
  feature: EntitlementFeatureKey;
  minimumTier?: SubscriptionTier;
}>;

export function TierGuard({ children, tier, feature, minimumTier }: TierGuardProps) {
  const [open, setOpen] = useState(false);
  const entitlement = useEntitlement(tier);

  if (entitlement.canAccessFeature(feature)) {
    return <>{children}</>;
  }

  const requiredTier = minimumTier ?? entitlement.minTierForFeature(feature);
  const canUpgrade = entitlement.hasTier(requiredTier) === false;

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">Upgrade to unlock this feature.</p>
      <div className="mt-3">
        <Button onClick={() => setOpen(true)} disabled={!canUpgrade}>
          Upgrade plan
        </Button>
      </div>
      <UpgradeModal open={open} onClose={() => setOpen(false)} requiredTier={requiredTier} />
    </div>
  );
}
