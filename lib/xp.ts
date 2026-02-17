import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseService } from '@/lib/supabaseServer';
import { awardBadgeServer } from '@/lib/gamification/server';

export const XP_EVENT_POINTS = {
  correct: 10,
  hard: 12,
  speaking_attempt: 5,
  writing_mini: 8,
} as const;

export type XpEventType = keyof typeof XP_EVENT_POINTS;

function client() {
  return supabaseService<any>();
}

async function totalCollocations(client: SupabaseClient<any>, userId: string) {
  const { data, error } = await client
    .from('user_challenge_progress')
    .select('total_mastered')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum: number, row: any) => sum + (row?.total_mastered ?? 0), 0);
}

async function speakingAttempts(client: SupabaseClient<any>, userId: string) {
  const { count, error } = await client
    .from('user_xp_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'speaking_attempt');

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function maybeUnlockBadges(
  sb: SupabaseClient<any>,
  userId: string,
  event: XpEventType,
): Promise<void> {
  if (event === 'hard' || event === 'correct') {
    const mastered = await totalCollocations(sb, userId);
    if (mastered >= 100) {
      await awardBadgeServer(sb, userId, 'first-100-mastered');
    }
    if (mastered >= 250) {
      await awardBadgeServer(sb, userId, 'collocation-crusher');
    }
  }

  if (event === 'speaking_attempt') {
    const attempts = await speakingAttempts(sb, userId);
    if (attempts >= 50) {
      await awardBadgeServer(sb, userId, 'pronunciation-50');
    }
  }
}

export async function logXpEvent(
  userId: string,
  event: XpEventType,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const xp = XP_EVENT_POINTS[event];
  if (!xp) {
    throw new Error(`Unsupported XP event: ${event}`);
  }

  const sb = client();
  const { error } = await sb
    .from('user_xp_events')
    .insert({ user_id: userId, event_type: event, xp, metadata: metadata ?? null });

  if (error) {
    throw new Error(error.message);
  }

  await maybeUnlockBadges(sb, userId, event);
  return xp;
}
