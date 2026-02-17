// pages/api/study-buddy/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';

function normaliseItems(items: any[]): any[] {
  return (items || []).map((item) => ({
    skill: item.skill,
    minutes: item.minutes,
    topic: item.topic ?? null,
    status: item.status ?? 'pending',
    note: item.note ?? null,
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return res.status(500).json({ error: 'Auth error', details: userErr.message });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('study_buddy_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: 'load_failed', details: error.message });

  const sessions = (data || []).map((row) => ({
    ...row,
    items: normaliseItems(row.items ?? []),
  }));

  const weeklyGoal = 210; // minutes
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  let weeklyMinutes = 0;
  const skillTotals: Record<string, number> = {};
  const daySet = new Set<string>();

  for (const session of sessions) {
    const sessionMinutes = Number(session.duration_minutes ?? 0) || session.items.reduce((sum: number, item: any) => sum + Number(item.minutes || 0), 0);
    const created = session.started_at ?? session.created_at;
    if (created && created >= weekAgoIso) {
      weeklyMinutes += sessionMinutes;
    }

    if (session.state === 'completed') {
      const dayKey = (session.ended_at ?? session.updated_at ?? session.created_at ?? '').slice(0, 10);
      if (dayKey) daySet.add(dayKey);
    }

    for (const item of session.items) {
      const key = item.skill || 'General';
      skillTotals[key] = (skillTotals[key] ?? 0) + Number(item.minutes || 0);
    }
  }

  const recommended = Object.entries(skillTotals).sort((a, b) => a[1] - b[1])[0]?.[0];
  const advice = recommended
    ? `Lean into ${recommended} — it’s your lightest skill this week.`
    : 'Start with a balanced warm-up to cover every skill.';

  const today = new Date();
  let streakDays = 0;
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streakDays += 1;
    } else if (i !== 0) {
      break;
    }
  }

  const recentSessions = sessions.slice(0, 6).map((session) => ({
    id: session.id,
    state: session.state,
    created_at: session.created_at,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_minutes: session.duration_minutes,
    xp_earned: session.xp_earned ?? 0,
    items: session.items,
  }));

  return res.status(200).json({
    ok: true,
    summary: {
      weeklyMinutes,
      weeklyGoal,
      advice,
      streakDays,
      totalSessions: sessions.length,
      recentSessions,
    },
  });
}
