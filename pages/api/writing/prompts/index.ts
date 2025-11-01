import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import type { WritingTaskType } from '@/lib/writing/schemas';

type PromptPayload = Readonly<{
  id: string;
  slug: string;
  topic: string;
  taskType: WritingTaskType;
  difficulty: number;
  outlineSummary: string | null;
  createdAt: string | null;
  source: 'library';
}>;

type ResponseBody =
  | { ok: true; prompts: PromptPayload[] }
  | { ok: false; error: string };

const mapRow = (
  row: Database['public']['Tables']['writing_prompts']['Row'],
): PromptPayload => {
  const outline = (row.outline_json ?? null) as { summary?: unknown } | null;
  const summary = typeof outline?.summary === 'string' ? outline.summary : null;
  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    taskType: row.task_type as WritingTaskType,
    difficulty: row.difficulty ?? 2,
    outlineSummary: summary,
    createdAt: row.created_at ?? null,
    source: 'library',
  };
};

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  const limitParam = Number.parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 48) : 36;

  const { data, error } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, outline_json, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Unable to load prompts' });
  }

  return res.status(200).json({ ok: true, prompts: (data ?? []).map(mapRow) });
}

export default withPlan('free', handler);
