import React from 'react';
import type { SubscriptionTier } from '@/lib/navigation/types';
import useEntitlement from '@/hooks/useEntitlement';

type TierGuardProps = {
  tier: string | null | undefined;
  minTier: SubscriptionTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function TierGuard({ tier, minTier, children, fallback = null }: TierGuardProps) {
  const entitlement = useEntitlement(tier);
  if (!entitlement.hasTier(minTier)) return <>{fallback}</>;
  return <>{children}</>;
}

export default TierGuard;
