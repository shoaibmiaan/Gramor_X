import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseFromRequest } from '@/lib/apiAuth';
import { env } from '@/lib/env';
import { redis } from '@/lib/redis';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { trackor } from '@/lib/analytics/trackor.server';

const LIMIT_WINDOW_SECONDS = 60 * 60 * 24;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode = 'exam', part } = (req.body ?? {}) as { mode?: string; part: 'p1'|'p2'|'p3' };
  if (!part) return res.status(400).json({ error: 'Missing part' });

  const supabase = supabaseFromRequest(req);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = authData.user.id;

  let tier: SubscriptionTier = 'free';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .maybeSingle<{ tier: SubscriptionTier | null }>();
    if (profile?.tier) tier = profile.tier;
  } catch (error) {
    console.warn('[speaking.start-attempt] failed to load tier', error);
  }

  const freeLimit = env.LIMIT_FREE_SPEAKING ?? 2;
  const limit = tier === 'free' && freeLimit > 0 ? freeLimit : Infinity;
  const todayKey = new Date().toISOString().slice(0, 10);
  const redisKey = `speaking:attempts:${userId}:${todayKey}`;

  let attemptsBefore = 0;
  let enforceLimit = Number.isFinite(limit);
  if (enforceLimit) {
    try {
      const existing = await redis.get(redisKey);
      attemptsBefore = existing ? Number(existing) : 0;
      if (!Number.isFinite(attemptsBefore) || Number.isNaN(attemptsBefore)) attemptsBefore = 0;
      if (attemptsBefore >= limit) {
        await trackor.log('speaking_attempt_limit_blocked', {
          user_id: userId,
          tier,
          attempts_today: attemptsBefore,
          limit,
          part,
          mode,
        });
        return res.status(429).json({ error: 'limit_reached', limit });
      }
    } catch (error) {
      console.warn('[speaking.start-attempt] redis get failed', error);
      enforceLimit = false;
    }
  }

  // Insert as the authed user under RLS
  const { data, error } = await supabase
    .from('speaking_attempts')
    .insert({ mode, part })
    .select('id')
    .single();

  if (error || !data) return res.status(400).json({ error: error?.message || 'Failed to start attempt' });

  let attemptsToday: number | null = null;
  if (enforceLimit) {
    try {
      const next = await redis.incr(redisKey);
      attemptsToday = next;
      if (next === 1) await redis.expire(redisKey, LIMIT_WINDOW_SECONDS);
    } catch (err) {
      console.warn('[speaking.start-attempt] redis incr failed', err);
      attemptsToday = null;
    }
  }

  await trackor.log('speaking_attempt_started', {
    attempt_id: data.id,
    user_id: userId,
    tier,
    mode,
    part,
    attempts_today: attemptsToday ?? (enforceLimit ? attemptsBefore + 1 : null),
    limit: enforceLimit ? limit : null,
  });

  return res.status(200).json({ attemptId: data.id });
}
