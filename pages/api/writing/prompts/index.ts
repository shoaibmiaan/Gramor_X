import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';
import type { PromptCard } from '@/types/writing-dashboard';
import { mapPromptRow } from '@/lib/writing/mappers';

type ResponseBody =
  | { ok: true; prompts: PromptCard[] }
  | { ok: false; error: string };

const PLAN_LIMIT: Record<PlanId, number> = {
  free: 12,
  starter: 100,
  booster: 500,
  master: 500,
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

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('plan_id')
    .eq('id', user.id)
    .maybeSingle();

  const planId = (profileRow?.plan_id as PlanId | undefined) ?? 'free';
  const planLimit = PLAN_LIMIT[planId] ?? PLAN_LIMIT.starter;

  const limitParam = Number.parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, planLimit) : planLimit;

  const { data, error } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, outline_json, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Unable to load prompts' });
  }

  return res.status(200).json({ ok: true, prompts: (data ?? []).map(mapPromptRow) });
}

export default withPlan('starter', handler);
