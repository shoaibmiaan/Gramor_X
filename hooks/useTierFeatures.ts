import { useMemo } from 'react';

export type Tier = 'free' | 'seedling' | 'rocket' | 'owl';

export type TierFeatures = {
  aiWritingLimit: number;
  speakingAnalysisLimit: number;
  predictiveAnalytics: boolean;
  realtimeAnalytics: boolean;
  liveCoaching: boolean;
  exportReports: boolean;
  studyBuddyAccess: boolean;
};

const DEFAULT_TIER: Tier = 'free';

const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free: {
    aiWritingLimit: 2,
    speakingAnalysisLimit: 2,
    predictiveAnalytics: false,
    realtimeAnalytics: false,
    liveCoaching: false,
    exportReports: false,
    studyBuddyAccess: false,
  },
  seedling: {
    aiWritingLimit: 10,
    speakingAnalysisLimit: 10,
    predictiveAnalytics: true,
    realtimeAnalytics: false,
    liveCoaching: false,
    exportReports: false,
    studyBuddyAccess: true,
  },
  rocket: {
    aiWritingLimit: 40,
    speakingAnalysisLimit: 40,
    predictiveAnalytics: true,
    realtimeAnalytics: true,
    liveCoaching: false,
    exportReports: true,
    studyBuddyAccess: true,
  },
  owl: {
    aiWritingLimit: 120,
    speakingAnalysisLimit: 120,
    predictiveAnalytics: true,
    realtimeAnalytics: true,
    liveCoaching: true,
    exportReports: true,
    studyBuddyAccess: true,
  },
};

const isTier = (value: string | null | undefined): value is Tier =>
  value === 'free' || value === 'seedling' || value === 'rocket' || value === 'owl';

export function useTierFeatures(tier: string | null | undefined) {
  return useMemo(() => {
    const normalizedTier: Tier = isTier(tier) ? tier : DEFAULT_TIER;
    return TIER_FEATURES[normalizedTier];
  }, [tier]);
}

export default useTierFeatures;
