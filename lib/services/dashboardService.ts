import type { SupabaseClient } from '@supabase/supabase-js';
import { getLatestUserScore, getLatestStreakLog } from '@/lib/repositories/analyticsRepository';
import { getActiveAiRecommendations } from '@/lib/repositories/aiRepository';
import { getSubscriptionSummary } from '@/lib/repositories/subscriptionRepository';

export type DashboardAggregate = {
  currentBand: number | null;
  currentScore: number | null;
  lastScoreAt: string | null;
  streakDays: number;
  lastActivityDate: string | null;
  recommendations: Array<{ id: string; type: string; priority: number; content: Record<string, unknown> }>;
  subscription: { planId: string; status: string | null };
  progress: {
    recommendationsCount: number;
    activeStreak: boolean;
    scoreConfidence: 'low' | 'medium' | 'high';
  };
};

export async function getDashboardAggregate(
  client: SupabaseClient<any, 'public', any>,
  userId: string,
): Promise<DashboardAggregate> {
  const [scoreRes, streakRes, recsRes, subscription] = await Promise.all([
    getLatestUserScore(client as any, userId),
    getLatestStreakLog(client as any, userId),
    getActiveAiRecommendations(client as any, userId),
    getSubscriptionSummary(client as any, userId),
  ]);

  const recs = (recsRes.data ?? []).map((row: any) => ({
    id: String(row.id),
    type: String(row.type ?? 'study_plan'),
    priority: Number(row.priority ?? 1),
    content: (row.content ?? {}) as Record<string, unknown>,
  }));

  const currentBand = scoreRes.data?.band == null ? null : Number(scoreRes.data.band);
  const confidence: DashboardAggregate['progress']['scoreConfidence'] =
    currentBand == null ? 'low' : currentBand >= 7 ? 'high' : 'medium';

  return {
    currentBand,
    currentScore: scoreRes.data?.score == null ? null : Number(scoreRes.data.score),
    lastScoreAt: scoreRes.data?.occurred_at ?? null,
    streakDays: Number(streakRes.data?.streak_days ?? 0),
    lastActivityDate: streakRes.data?.activity_date ?? null,
    recommendations: recs,
    subscription: {
      planId: subscription.plan,
      status: subscription.status,
    },
    progress: {
      recommendationsCount: recs.length,
      activeStreak: Number(streakRes.data?.streak_days ?? 0) > 0,
      scoreConfidence: confidence,
    },
  };
}
