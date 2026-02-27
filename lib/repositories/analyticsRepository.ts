import type { SupabaseClient } from '@supabase/supabase-js';

export type RepoClient = SupabaseClient<any, 'public', any>;

export async function getLatestUserScore(client: RepoClient, userId: string) {
  return client
    .from('score_history')
    .select('id, user_id, score, band, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getLatestStreakLog(client: RepoClient, userId: string) {
  return client
    .from('streak_logs')
    .select('id, user_id, activity_date, streak_days, created_at')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(1)
    .maybeSingle();
}
