import type { SupabaseClient } from '@supabase/supabase-js';

export type DashboardAggregate = {
  score: { band: number | null; score: number | null; occurredAt: string | null };
  streak: { streakDays: number; activityDate: string | null };
  recommendations: Array<Record<string, unknown>>;
  subscription: { planId: string; status: string | null };
};

export async function getDashboardAggregate(
  client: SupabaseClient<any, 'public', any>,
  userId: string,
): Promise<DashboardAggregate> {
  const [scoreRes, streakRes, recsRes, subRes] = await Promise.all([
    client
      .from('score_history')
      .select('band, score, occurred_at')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('streak_logs')
      .select('streak_days, activity_date')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('ai_recommendations')
      .select('id, type, priority, content, created_at')
      .eq('user_id', userId)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    client
      .from('subscriptions')
      .select('plan_id, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    score: {
      band: scoreRes.data?.band ?? null,
      score: scoreRes.data?.score ?? null,
      occurredAt: scoreRes.data?.occurred_at ?? null,
    },
    streak: {
      streakDays: Number(streakRes.data?.streak_days ?? 0),
      activityDate: streakRes.data?.activity_date ?? null,
    },
    recommendations: (recsRes.data ?? []) as Array<Record<string, unknown>>,
    subscription: {
      planId: (subRes.data?.plan_id as string | null) ?? 'free',
      status: (subRes.data?.status as string | null) ?? null,
    },
  };
}
