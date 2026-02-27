import { useMemo } from 'react';
import type { SubscriptionTier } from '@/lib/navigation/types';
import {
  featureMinTier,
  hasTierAccess,
  isFeatureEnabledForTier,
  normalizeTier,
  type EntitlementFeatureKey,
} from '@/lib/config/featureFlags';

export type UseEntitlementResult = {
  tier: SubscriptionTier;
  canAccessFeature: (feature: EntitlementFeatureKey) => boolean;
  hasTier: (minTier: SubscriptionTier) => boolean;
  minTierForFeature: (feature: EntitlementFeatureKey) => SubscriptionTier;
};

export function useEntitlement(tier: string | null | undefined): UseEntitlementResult {
  return useMemo(() => {
    const normalizedTier = normalizeTier(tier);

    return {
      tier: normalizedTier,
      canAccessFeature: (feature: EntitlementFeatureKey) => isFeatureEnabledForTier(feature, normalizedTier),
      hasTier: (minTier: SubscriptionTier) => hasTierAccess(normalizedTier, minTier),
      minTierForFeature: (feature: EntitlementFeatureKey) => featureMinTier[feature],
    };
  }, [tier]);
}

export default useEntitlement;
