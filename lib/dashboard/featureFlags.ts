import type { DashboardFeatureKey, SubscriptionTier } from '@/types/dashboard';

const featureMap: Record<SubscriptionTier, DashboardFeatureKey[]> = {
  seedling: ['basicAnalytics'],
  rocket: ['basicAnalytics', 'advancedAnalytics', 'smartStudyPlan', 'detailedBreakdown'],
  owl: [
    'basicAnalytics',
    'advancedAnalytics',
    'smartStudyPlan',
    'detailedBreakdown',
    'fullAiInsights',
    'deepPerformanceReports',
    'speakingAnalytics',
    'essayEvaluationHistory',
  ],
};

export const hasFeatureAccess = (tier: SubscriptionTier, feature: DashboardFeatureKey) =>
  featureMap[tier].includes(feature);

export const tierRank: Record<SubscriptionTier, number> = {
  seedling: 1,
  rocket: 2,
  owl: 3,
};
