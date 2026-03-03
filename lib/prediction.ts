import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseService } from '@/lib/supabaseServer';

type DBClient = SupabaseClient<any>;

export type PredictionResult = {
  predictedBand: number;
  confidenceInterval: number;
  breakdown: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
};

function clampBand(value: number) {
  return Math.max(0, Math.min(9, Math.round(value * 2) / 2));
}

function getClient(client?: DBClient): DBClient {
  return client ?? (supabaseService() as DBClient);
}

export async function predictBandScore(userId: string, client?: DBClient): Promise<PredictionResult> {
  const db = getClient(client);

  const [{ data: history }, { data: profile }] = await Promise.all([
    db
      .from('score_history')
      .select('band, occurred_at')
      .eq('user_id', userId)
      .not('band', 'is', null)
      .order('occurred_at', { ascending: false })
      .limit(20),
    db.from('user_skill_profiles').select('proficiency, learning_pace').eq('user_id', userId).maybeSingle(),
  ]);

  const recent = (history ?? []).map((row: any, idx) => {
    const weight = Math.max(0.2, 1 - idx * 0.06);
    return Number(row.band ?? 0) * weight;
  });
  const totalWeight = recent.reduce((sum, _, idx) => sum + Math.max(0.2, 1 - idx * 0.06), 0) || 1;
  const weightedRecent = recent.reduce((a, b) => a + b, 0) / totalWeight;

  const proficiency = profile?.proficiency ?? {};
  const skillValues = Object.values(proficiency).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const skillAverage = skillValues.length ? skillValues.reduce((a, b) => a + b, 0) / skillValues.length : weightedRecent || 5.5;

  const learningPace = Number(profile?.learning_pace ?? 0);
  const paceFactor = Math.max(-0.4, Math.min(0.4, learningPace));

  const predictedBand = clampBand(weightedRecent * 0.7 + skillAverage * 0.25 + paceFactor * 0.05);

  const variance = skillValues.length
    ? skillValues.reduce((acc, cur) => acc + Math.pow(cur - skillAverage, 2), 0) / skillValues.length
    : 0.5;
  const confidenceInterval = Math.max(0.25, Math.min(1, Number((Math.sqrt(variance) * 0.4 + 0.3).toFixed(2))));

  const previousWindow = (history ?? []).slice(8, 16).map((row: any) => Number(row.band ?? 0));
  const prevAverage = previousWindow.length
    ? previousWindow.reduce((a: number, b: number) => a + b, 0) / previousWindow.length
    : predictedBand;
  const trend: PredictionResult['trend'] = predictedBand - prevAverage > 0.2 ? 'up' : prevAverage - predictedBand > 0.2 ? 'down' : 'stable';

  return {
    predictedBand,
    confidenceInterval,
    breakdown: {
      recentPerformance: Number(weightedRecent.toFixed(2)),
      skillAverage: Number(skillAverage.toFixed(2)),
      learningPace: Number(learningPace.toFixed(3)),
    },
    trend,
  };
}

export async function predictBandWhatIf(
  userId: string,
  adjustments: Partial<Record<'reading' | 'writing' | 'speaking' | 'listening', number>>,
  client?: DBClient,
): Promise<PredictionResult & { uplift: number }> {
  const baseline = await predictBandScore(userId, client);
  const db = getClient(client);

  const { data: profile } = await db.from('user_skill_profiles').select('proficiency').eq('user_id', userId).maybeSingle();
  const proficiency = { ...(profile?.proficiency ?? {}) } as Record<string, number>;

  Object.entries(adjustments).forEach(([key, value]) => {
    if (typeof value === 'number') proficiency[key] = value;
  });

  const skillValues = Object.values(proficiency).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const skillAverage = skillValues.length ? skillValues.reduce((a, b) => a + b, 0) / skillValues.length : baseline.predictedBand;
  const adjusted = clampBand(baseline.breakdown.recentPerformance * 0.7 + skillAverage * 0.3);

  return {
    ...baseline,
    predictedBand: adjusted,
    uplift: Number((adjusted - baseline.predictedBand).toFixed(2)),
  };
}
