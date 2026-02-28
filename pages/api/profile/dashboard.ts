import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const [{ data: profile }, { data: bandRows }, { data: feedbackRows }, { data: usageRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('band_history')
      .select('week_label, band')
      .eq('user_id', user.id)
      .order('week_label', { ascending: true })
      .limit(12),
    supabase
      .from('coach_notes')
      .select('id, feedback, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('usage_limits')
      .select('ai_writing_used, ai_writing_limit')
      .eq('user_id', user.id)
      .limit(1),
  ]);

  const trend = (bandRows ?? []).map((row) => ({
    label: String(row.week_label ?? 'Week'),
    band: Number(row.band ?? 0),
  }));

  const estimatedBand = trend.length ? trend[trend.length - 1]?.band ?? null : null;
  const tokenUsage = usageRows?.[0]
    ? { used: Number(usageRows[0].ai_writing_used ?? 0), total: Number(usageRows[0].ai_writing_limit ?? 0) }
    : { used: 0, total: 0 };

  return res.status(200).json({
    profile: profile ?? null,
    estimatedBand,
    trend,
    weaknessHeatmap: [
      { skill: 'Listening', value: 52 },
      { skill: 'Reading', value: 64 },
      { skill: 'Writing', value: 41 },
      { skill: 'Speaking', value: 57 },
    ],
    aiFeedbackHistory: (feedbackRows ?? []).map((row) => ({
      id: String(row.id),
      message: String((row as any).feedback ?? 'AI feedback generated.'),
      createdAt: String(row.created_at),
    })),
    nextTasks: [
      { id: 'task-1', title: 'Timed Writing Task 2 drill', reason: 'Improve coherence and response depth.' },
      { id: 'task-2', title: 'Listening Section 3 review', reason: 'Weakness hotspot detected in detail capture.' },
    ],
    tokenUsage,
  });
}
