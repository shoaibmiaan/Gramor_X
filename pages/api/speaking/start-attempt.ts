import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseFromRequest } from '@/lib/apiAuth';
import { trackor } from '@/lib/analytics/trackor.server';
import { checkLimit, incrementUsage, limitExceeded } from '@/lib/usage';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode = 'exam', part } = (req.body ?? {}) as { mode?: string; part: 'p1' | 'p2' | 'p3' };
  if (!part) return res.status(400).json({ error: 'Missing part' });

  const supabase = supabaseFromRequest(req);
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  let plan: 'free' | 'starter' | 'booster' | 'master' = 'free';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership_plan')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.membership_plan) plan = profile.membership_plan as typeof plan;
  } catch (error) {
    console.warn('[speaking.start] failed to read plan', error);
  }

  const freeLimit = Number(process.env.LIMIT_FREE_SPEAKING ?? 2) || 0;
  const enforceLimit = plan === 'free' && freeLimit > 0;
  const today = new Date().toISOString().slice(0, 10);

  if (enforceLimit) {
    try {
      const limitCheck = await checkLimit({
        userId: user.id,
        key: 'speaking:attempts',
        limit: freeLimit,
      });
      if (!limitCheck.allowed) {
        await trackor.log('speaking_attempt_blocked', {
          reason: 'daily_limit',
          user_id: user.id,
          plan,
          limit: freeLimit,
          date: today,
        });
        return res.status(429).json(limitExceeded('speaking_attempts_limit_reached', freeLimit));
      }
    } catch (error) {
      console.warn('[speaking.start] usage check failed', error);
    }
  }

  const startedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('speaking_attempts')
    .insert({ mode, part })
    .select('id')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  let dailyCount: number | undefined;
  if (enforceLimit) {
    try {
      dailyCount = await incrementUsage(user.id, 'speaking:attempts');
    } catch (err) {
      console.warn('[speaking.start] usage increment failed', err);
    }
  }

  try {
    await trackor.log('speaking_attempt_started', {
      attempt_id: data.id,
      user_id: user.id,
      plan,
      mode,
      part,
      started_at: startedAt,
      daily_limit: enforceLimit ? freeLimit : null,
      daily_count: dailyCount ?? null,
    });
    await trackor.log('speaking_attempt', {
      attempt_id: data.id,
      user_id: user.id,
      plan,
      mode,
      part,
      started_at: startedAt,
      daily_limit: enforceLimit ? freeLimit : null,
      daily_count: dailyCount ?? null,
    });
  } catch (logErr) {
    console.warn('[speaking.start] analytics failed', logErr);
  }

  return res.status(200).json({ attemptId: data.id });
}
