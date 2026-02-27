import type { SubscriptionTier } from '@/lib/navigation/types';

export type EntitlementFeatureKey =
  | 'aiCoach'
  | 'studyBuddy'
  | 'mistakesBook'
  | 'whatsappTasks'
  | 'realtimeDashboard'
  | 'advancedInsights';

export type TierWithAliases = SubscriptionTier | 'starter' | 'booster' | 'master';

const ALIAS_TO_TIER: Record<TierWithAliases, SubscriptionTier> = {
  free: 'free',
  seedling: 'seedling',
  rocket: 'rocket',
  owl: 'owl',
  starter: 'seedling',
  booster: 'rocket',
  master: 'owl',
};

const FEATURE_MIN_TIER: Record<EntitlementFeatureKey, SubscriptionTier> = {
  aiCoach: 'seedling',
  studyBuddy: 'seedling',
  mistakesBook: 'seedling',
  whatsappTasks: 'free',
  realtimeDashboard: 'owl',
  advancedInsights: 'rocket',
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  seedling: 1,
  rocket: 2,
  owl: 3,
};

export const normalizeTier = (tier: string | null | undefined): SubscriptionTier => {
  if (!tier) return 'free';
  const normalized = tier.toLowerCase() as TierWithAliases;
  return ALIAS_TO_TIER[normalized] ?? 'free';
};

export const hasTierAccess = (tier: string | null | undefined, minTier: SubscriptionTier): boolean => {
  const normalized = normalizeTier(tier);
  return TIER_RANK[normalized] >= TIER_RANK[minTier];
};

export const isFeatureEnabledForTier = (
  feature: EntitlementFeatureKey,
  tier: string | null | undefined,
): boolean => hasTierAccess(tier, FEATURE_MIN_TIER[feature]);

export const featureMinTier = FEATURE_MIN_TIER;
