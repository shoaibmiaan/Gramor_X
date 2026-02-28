import { useMemo } from 'react';
import useSWR from 'swr';
import type { SubscriptionTier } from '@/lib/navigation/types';
import {
  featureMinTier,
  hasTierAccess,
  isFeatureEnabledForTier,
  normalizeTier,
  type EntitlementFeatureKey,
} from '@/lib/config/featureFlags';

type EntitlementApiResponse = {
  ok: boolean;
  plan: 'free' | 'starter' | 'booster' | 'master';
  tier: SubscriptionTier;
  status: string | null;
  featureFlags: Record<string, boolean>;
};

export type UseEntitlementResult = {
  tier: SubscriptionTier;
  plan: EntitlementApiResponse['plan'];
  status: string | null;
  loading: boolean;
  canAccessFeature: (feature: EntitlementFeatureKey) => boolean;
  hasTier: (minTier: SubscriptionTier) => boolean;
  minTierForFeature: (feature: EntitlementFeatureKey) => SubscriptionTier;
};

async function fetchEntitlements(url: string): Promise<EntitlementApiResponse> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to fetch entitlements (${response.status})`);
  }
  return (await response.json()) as EntitlementApiResponse;
}

export function useEntitlement(tier: string | null | undefined): UseEntitlementResult {
  const { data, isLoading } = useSWR<EntitlementApiResponse>('/api/entitlements', fetchEntitlements, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return useMemo(() => {
    const normalizedTier = data?.tier ?? normalizeTier(tier);
    const plan = data?.plan ?? 'free';
    const status = data?.status ?? null;
    const dynamicFlags = data?.featureFlags ?? {};

    return {
      tier: normalizedTier,
      plan,
      status,
      loading: isLoading,
      canAccessFeature: (feature: EntitlementFeatureKey) => {
        if (typeof dynamicFlags[feature] === 'boolean') {
          return Boolean(dynamicFlags[feature]);
        }
        return isFeatureEnabledForTier(feature, normalizedTier);
      },
      hasTier: (minTier: SubscriptionTier) => hasTierAccess(normalizedTier, minTier),
      minTierForFeature: (feature: EntitlementFeatureKey) => featureMinTier[feature],
    };
  }, [data?.featureFlags, data?.plan, data?.status, data?.tier, isLoading, tier]);
}

export default useEntitlement;
