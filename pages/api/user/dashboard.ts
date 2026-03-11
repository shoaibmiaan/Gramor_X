import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

type ModuleId = 'listening' | 'reading' | 'writing' | 'speaking';

type ModuleCard = Readonly<{
  id: ModuleId;
  title: string;
  progress: number;
  lastActivityAt: string | null;
  nextAction: string;
}>;

type DashboardPayload = Readonly<{
  user: { name: string };
  modules: ModuleCard[];
  nextAction: string;
}>;

type ProgressRow = {
  skill: string | null;
  band: number | string | null;
  attempt_date: string | null;
};

const MODULE_META: Record<ModuleId, { title: string; nextAction: string }> = {
  listening: { title: 'Listening', nextAction: '/mock/listening' },
  reading: { title: 'Reading', nextAction: '/mock/reading' },
  writing: { title: 'Writing', nextAction: '/mock/writing' },
  speaking: { title: 'Speaking', nextAction: '/mock/speaking' },
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toBand(raw: number | string | null): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mapBandToProgress(avgBand: number): number {
  return clampProgress((avgBand / 9) * 100);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardPayload | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return res.status(500).json({ error: authError.message });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [{ data: profileRow, error: profileError }, { data: rows, error: progressError }] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      supabase
        .from('progress_band_trajectory')
        .select('skill, band, attempt_date')
        .eq('user_id', user.id)
        .order('attempt_date', { ascending: false }),
    ]);

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  if (progressError) {
    return res.status(500).json({ error: progressError.message });
  }

  const rowsBySkill = new Map<ModuleId, ProgressRow[]>();
  (Object.keys(MODULE_META) as ModuleId[]).forEach((key) => rowsBySkill.set(key, []));

  (rows ?? []).forEach((row) => {
    const skill = (row.skill ?? '').toLowerCase() as ModuleId;
    if (rowsBySkill.has(skill)) {
      rowsBySkill.get(skill)?.push(row as ProgressRow);
    }
  });

  const modules = (Object.keys(MODULE_META) as ModuleId[]).map((id) => {
    const meta = MODULE_META[id];
    const skillRows = rowsBySkill.get(id) ?? [];
    const avgBand =
      skillRows.length > 0
        ? skillRows.reduce((sum, row) => sum + toBand(row.band), 0) / skillRows.length
        : 0;

    return {
      id,
      title: meta.title,
      progress: mapBandToProgress(avgBand),
      lastActivityAt: skillRows[0]?.attempt_date ?? null,
      nextAction: meta.nextAction,
    };
  });

  const moduleWithLatestActivity = modules
    .filter((module) => !!module.lastActivityAt)
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime(),
    )[0];

  const payload: DashboardPayload = {
    user: {
      name:
        profileRow?.full_name ??
        user.user_metadata?.full_name ??
        user.email?.split('@')[0] ??
        'Learner',
    },
    modules,
    nextAction: moduleWithLatestActivity?.nextAction ?? '/dashboard',
  };

  return res.status(200).json(payload);
}
