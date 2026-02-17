// pages/api/ai/next-item.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

type Out = {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  primaryType: 'tfng' | 'mcq' | 'matching' | 'short';
  reason: string;
  href: string;        // deep link to filtered reading list
  minSecPerQ?: number; // pacing hint for client timers
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Out | { error: string }>) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const supabase = getServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Pull last 40 answers across sessions (lightweight)
    const sessions = await supabase
      .from('reading_sessions')
      .select('id, q_count, time_sec, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(20);

    const sessionIds = (sessions.data ?? []).map(s => s.id);
    const answers = sessionIds.length ? await supabase
      .from('reading_answers')
      .select('type, correct, time_sec')
      .in('session_id', sessionIds)
      .order('id', { ascending: false })
      .limit(200) : { data: [] as any[] };

    // Aggregate by type
    const byType = new Map<string, { correct: number; total: number; sec: number; n: number }>();
    for (const a of (answers.data ?? [])) {
      const k = String(a.type || 'mcq');
      const cur = byType.get(k) || { correct: 0, total: 0, sec: 0, n: 0 };
      cur.total += 1; cur.correct += a.correct ? 1 : 0;
      const t = Number(a.time_sec || 0);
      if (Number.isFinite(t)) { cur.sec += t; cur.n += 1; }
      byType.set(k, cur);
    }

    // Pick a primary type to focus: lowest accuracy with >= 15 attempts; else the most attempted
    let primaryType: 'tfng' | 'mcq' | 'matching' | 'short' = 'mcq';
    if (byType.size) {
      const arr = Array.from(byType.entries()).map(([type, v]) => ({
        type,
        acc: v.total ? v.correct / v.total : 0,
        attempts: v.total,
        secPerQ: v.n ? v.sec / v.n : 60
      }));
      const weak = arr.filter(x => x.attempts >= 15).sort((a, b) => a.acc - b.acc)[0] || arr.sort((a, b) => b.attempts - a.attempts)[0];
      primaryType = (weak?.type as any) ?? 'mcq';
    }

    // Recent overall KPIs for difficulty choice
    const lastSessions = (sessions.data ?? []).slice(0, 6);
    const avgSecPerQ = (() => {
      const vals = lastSessions.map(s => s.q_count ? Number(s.time_sec || 0) / Number(s.q_count) : NaN).filter(Number.isFinite) as number[];
      if (!vals.length) return 60;
      return vals.reduce((a,b)=>a+b,0)/vals.length;
    })();

    // Compute recent accuracy crude (from answers)
    const total = Array.from(byType.values()).reduce((a,b)=>a+b.total,0);
    const correct = Array.from(byType.values()).reduce((a,b)=>a+b.correct,0);
    const acc = total ? correct/total : 0.6;

    // Heuristic:
    // - If acc >= 0.8 and avgSecPerQ <= 55s -> Hard
    // - If acc <= 0.6 or avgSecPerQ >= 75s -> Easy
    // - Else -> Medium
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (acc >= 0.8 && avgSecPerQ <= 55) difficulty = 'Hard';
    else if (acc <= 0.6 || avgSecPerQ >= 75) difficulty = 'Easy';

    const reason = `Acc ${(acc*100).toFixed(0)}% • ${Math.round(avgSecPerQ)}s/Q • focus ${primaryType.toUpperCase()}`;
    const href = `/reading?type=${primaryType}`;

    // Pacing hint
    const minSecPerQ = difficulty === 'Easy' ? 50 : difficulty === 'Medium' ? 60 : 70;

    return res.status(200).json({ difficulty, primaryType, reason, href, minSecPerQ });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
