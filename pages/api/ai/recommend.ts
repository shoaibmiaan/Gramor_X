// pages/api/ai/recommend.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAIRecommendations, type RecommendInput } from '@/lib/ai/provider';
import { getServerClient } from '@/lib/supabaseServer';

type Ok = Awaited<ReturnType<typeof getAIRecommendations>>;
type Err = { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const supabase = getServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Pull minimal stats; keep tolerant if tables don’t exist yet.
    // Prefer your existing views if present; otherwise compute basics.
    const sessions = await supabase
      .from('reading_sessions')
      .select('id, slug, title, submitted_at, score_pct, q_count, time_sec, difficulty')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(60);

    const answers = await supabase
      .from('reading_answers')
      .select('type, correct')
      .in('session_id', (sessions.data ?? []).map(s => s.id));

    // Derive KPIs
    const last10 = (sessions.data ?? []).slice(0, 10);
    const accuracy10 = last10.length
      ? last10.reduce((a, s) => a + (typeof s.score_pct === 'number' ? s.score_pct : 0), 0) / (last10.length * 100)
      : undefined;

    const totalPractices = sessions.data?.length ?? 0;
    const avgSecPerQ = (() => {
      const xs = (sessions.data ?? []).map(s =>
        s && s.q_count ? (Number(s.time_sec || 0) / Number(s.q_count)) : NaN);
      const vals = xs.filter(v => Number.isFinite(v)) as number[];
      if (!vals.length) return undefined;
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    })();

    // By-type accuracy from answers
    const byTypeMap = new Map<string, { correct: number; total: number }>();
    for (const a of (answers.data ?? [])) {
      const key = String(a.type || 'mcq');
      const cur = byTypeMap.get(key) || { correct: 0, total: 0 };
      cur.total += 1;
      if (a.correct) cur.correct += 1;
      byTypeMap.set(key, cur);
    }
    const byType = Array.from(byTypeMap.entries()).map(([type, v]) => ({
      type: type as any,
      accuracy: v.total ? v.correct / v.total : 0,
      attempts: v.total,
    }));

    // Recent (compact)
    const recent = (sessions.data ?? []).slice(0, 12).map(s => ({
      slug: s.slug ?? String(s.id),
      title: s.title ?? 'Reading practice',
      date: s.submitted_at,
      score: typeof s.score_pct === 'number' ? s.score_pct / 100 : 0,
      minutes: Math.round((Number(s.time_sec || 0) / 60) || 0),
      types: [] as any[], // If you store per-session types, fill here
    }));

    // Band estimate: if you already compute it, pull it. Else coarse estimate from avg last 10.
    const bandEstimate = (() => {
      if (!last10.length) return undefined;
      const avg = last10.reduce((a, s) => a + (s.score_pct ?? 0), 0) / last10.length; // 0..100
      // Coarse mapping: 30%~5.0, 50%~6.0, 70%~7.0, 85%~8.0
      if (avg <= 35) return 5.0;
      if (avg <= 55) return 6.0;
      if (avg <= 72) return 7.0;
      if (avg <= 88) return 7.5;
      return 8.0;
    })();

    const payload: RecommendInput = {
      userId: user.id,
      kpis: {
        bandEstimate,
        accuracy10,
        avgSecPerQ,
        streakDays: undefined,         // if you track streaks, populate
        totalPractices,
      },
      byType: byType as any,
      recent,
    };

    const recs = await getAIRecommendations(payload);
    // Optional: cache-control to soften bursts
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json(recs);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
