import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type DB = SupabaseClient<Database>;

export type BandPoint = { label: string; band: number };

export async function getEstimatedBandScore(client: DB, userId: string): Promise<number | null> {
  const { data } = await client
    .from('user_scores')
    .select('current_band, updated_at')
    .eq('user_id', userId)
    .maybeSingle<{ current_band: number | null }>();

  if (typeof data?.current_band === 'number') return data.current_band;

  const { data: latest } = await client
    .from('score_history')
    .select('band')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ band: number | null }>();

  return typeof latest?.band === 'number' ? latest.band : null;
}

export async function getSkillHeatmap(client: DB, userId: string) {
  const { data } = await client
    .from('reading_sessions')
    .select('score_pct')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(20);

  const reading = Math.round(((data ?? []).reduce((a, b) => a + Number(b.score_pct ?? 0), 0) / Math.max(1, (data ?? []).length)) / 10) || 0;
  const base = Math.max(4, Math.min(9, reading / 10 + 5));

  return [
    { skill: 'Reading', score: Math.max(0, Math.min(10, reading / 10)) },
    { skill: 'Writing', score: Math.max(0, Math.min(10, base - 0.4)) },
    { skill: 'Speaking', score: Math.max(0, Math.min(10, base - 0.2)) },
    { skill: 'Listening', score: Math.max(0, Math.min(10, base - 0.1)) },
  ];
}

export async function getStrengthsWeaknesses(client: DB, userId: string) {
  const heatmap = await getSkillHeatmap(client, userId);
  const sorted = [...heatmap].sort((a, b) => b.score - a.score);
  return {
    strengths: sorted.slice(0, 2),
    weaknesses: sorted.slice(-2).reverse(),
  };
}

export async function getStudyStreak(client: DB, userId: string): Promise<number> {
  const { data } = await client
    .from('streak_logs')
    .select('streak_days')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(1)
    .maybeSingle<{ streak_days: number | null }>();

  return Number(data?.streak_days ?? 0);
}

export async function getImprovementGraph(client: DB, userId: string, days = 30): Promise<BandPoint[]> {
  const { data } = await client
    .from('score_history')
    .select('occurred_at, band')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: true })
    .limit(Math.max(7, days));

  return (data ?? [])
    .filter((row) => typeof row.band === 'number')
    .map((row) => ({
      label: new Date(String(row.occurred_at)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      band: Number(row.band ?? 0),
    }));
}
