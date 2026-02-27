import { useMemo } from 'react';
import type { SubscriptionTier } from '@/types/dashboard';

export function useSubscriptionTier(defaultTier: SubscriptionTier = 'seedling') {
  return useMemo(() => defaultTier, [defaultTier]);
}
