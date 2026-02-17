// pages/api/reading/forecast.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { regressETA, deriveBand, type TrendPoint } from '@/lib/analytics/readingForecast';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const supabase = getServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Pull last 60 sessions (score_pct out of 100)
    const { data: sessions } = await supabase
      .from('reading_sessions')
      .select('submitted_at, score_pct')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: true })
      .limit(60);

    const trend: TrendPoint[] = (sessions ?? [])
      .filter(s => typeof s.score_pct === 'number')
      .map(s => ({ date: s.submitted_at as string, score: (s.score_pct as number) / 100 }));

    const current = trend.at(-1)?.score ?? 0.6;
    const bandNow = deriveBand(current);

    const target = Number(req.query.target ?? 7.0);
    const fc = regressETA(trend, target);

    return res.status(200).json({
      bandNow,
      currentPct: current,
      ...fc,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
