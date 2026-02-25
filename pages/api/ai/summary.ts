// pages/api/ai/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.GX_AI_MODEL || 'gpt-4o-mini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const supabase = getServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: recent } = await supabase
      .from('reading_sessions')
      .select('slug, title, submitted_at, score_pct, q_count, time_sec')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(8);

    // Quick local heuristic if no API key
    if (!API_KEY) {
      const best = (recent ?? []).slice(0, 8).reduce((a, s) => Math.max(a, s.score_pct ?? 0), 0);
      const msg = best > 0 ? `Last sessions show a high of ${(best).toFixed(0)}%. Repeat a short set to consolidate.` : 'Complete a first session to unlock insights.';
      return res.status(200).json({ summary: msg });
    }

    const sys = 'Summarize user progress in 1–2 short sentences. Suggest the next focus. Keep it actionable.';
    const userMsg = JSON.stringify(recent ?? []);

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.3,
        max_tokens: 120,
      }),
    });

    if (!r.ok) return res.status(200).json({ summary: 'Keep practicing; AI summary unavailable.' });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content || 'Keep practicing; AI summary unavailable.';
    return res.status(200).json({ summary: text });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
