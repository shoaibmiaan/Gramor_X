import { useMemo } from 'react';

import type { SubscriptionTier } from '@/lib/navigation/types';

type UsageParams = {
  tier: SubscriptionTier;
  readingTestsUsed: number;
  writingFeedbackUsed: number;
  speakingAnalysisUsed: number;
};

type UsageItem = {
  used: number;
  limit: number;
  remaining: number;
  resetDate: string;
};

export type UsageLimitsState = {
  readingTests: UsageItem;
  writingFeedback: UsageItem;
  speakingAnalysis: UsageItem;
};

const limitsByTier: Record<SubscriptionTier, { reading: number; writing: number; speaking: number }> = {
  free: { reading: 3, writing: 3, speaking: 2 },
  seedling: { reading: 12, writing: 10, speaking: 10 },
  rocket: { reading: 30, writing: 40, speaking: 40 },
  owl: { reading: 80, writing: 120, speaking: 120 },
};

const monthEndISO = () => {
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return resetDate.toISOString();
};

export function useUsageLimits({ tier, readingTestsUsed, writingFeedbackUsed, speakingAnalysisUsed }: UsageParams) {
  return useMemo<UsageLimitsState>(() => {
    const config = limitsByTier[tier];
    const resetDate = monthEndISO();

    const makeItem = (usedRaw: number, limit: number): UsageItem => {
      const used = Math.max(0, Math.min(limit, usedRaw));
      return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        resetDate,
      };
    };

    return {
      readingTests: makeItem(readingTestsUsed, config.reading),
      writingFeedback: makeItem(writingFeedbackUsed, config.writing),
      speakingAnalysis: makeItem(speakingAnalysisUsed, config.speaking),
    };
  }, [tier, readingTestsUsed, writingFeedbackUsed, speakingAnalysisUsed]);
}

export default useUsageLimits;
