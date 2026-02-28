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
  recommendations: Array<{
    id: string;
    type: string;
    priority: number;
    content: Record<string, unknown>;
    modelVersion: string | null;
    createdAt: string | null;
    expiresAt: string | null;
    consumedAt: string | null;
  }>;
  subscription: { planId: string; status: string | null };
  progress: {
    recommendationsCount: number;
    activeStreak: boolean;
    scoreConfidence: 'low' | 'medium' | 'high';
  };
};

type CacheEntry = { value: DashboardAggregate; expiresAt: number };
const CACHE_TTL_MS = 30_000;
const dashboardCache = new Map<string, CacheEntry>();

function readCache(userId: string): DashboardAggregate | null {
  const hit = dashboardCache.get(userId);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    dashboardCache.delete(userId);
    return null;
  }
  return hit.value;
}

function writeCache(userId: string, value: DashboardAggregate) {
  dashboardCache.set(userId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function getDashboardAggregate(
  client: SupabaseClient<any, 'public', any>,
  userId: string,
  opts?: { skipCache?: boolean },
): Promise<DashboardAggregate> {
  if (!opts?.skipCache) {
    const cached = readCache(userId);
    if (cached) return cached;
  }

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
    modelVersion: row.model_version == null ? null : String(row.model_version),
    createdAt: row.created_at == null ? null : String(row.created_at),
    expiresAt: row.expires_at == null ? null : String(row.expires_at),
    consumedAt: row.consumed_at == null ? null : String(row.consumed_at),
  }));

  const currentBand = scoreRes.data?.band == null ? null : Number(scoreRes.data.band);
  const confidence: DashboardAggregate['progress']['scoreConfidence'] =
    currentBand == null ? 'low' : currentBand >= 7 ? 'high' : 'medium';

  const aggregate: DashboardAggregate = {
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

  writeCache(userId, aggregate);
  return aggregate;
}
