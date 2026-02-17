import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

import { withPlan } from '@/lib/plan/withPlan';
import { pickNextTask } from '@/lib/reco/rules';
import type { RecommendationResult } from '@/lib/reco/rules';
import type { Database, LearningModule, LearningProfileRow, LearningSignal, LearningTask } from '@/types/supabase';
import { coercePlanId } from '@/types/pricing';

function safeMetadata(task: LearningTask) {
  const metadata = (task.metadata ?? {}) as Record<string, unknown>;
  const deeplink = typeof metadata.deeplink === 'string' ? metadata.deeplink : '/learning';
  const title = typeof metadata.title === 'string' ? metadata.title : task.slug.replace(/[-_]/g, ' ');
  const summary = typeof metadata.summary === 'string' ? metadata.summary : null;
  return { metadata, deeplink, title, summary };
}

type NextTaskResponse = {
  recommendationId: string | null;
  task: {
    id: string;
    slug: string;
    module: LearningModule;
    type: string;
    estMinutes: number;
    difficulty: string | null;
    tags: string[];
    minPlan: string;
    deeplink: string;
    title: string;
    summary: string | null;
  } | null;
  reason: string | null;
  score: number | null;
  evidence: RecommendationResult['evidence'];
};

async function fetchPlan(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();
  const planValue = (data as { plan?: string | null } | null)?.plan ?? null;
  return coercePlanId(planValue ?? undefined);
}

function recentModulesFromRuns(runs: { task_id: string }[], tasks: LearningTask[]): LearningModule[] {
  const map = new Map<string, LearningTask>();
  tasks.forEach((task) => map.set(task.id as string, task));
  return runs
    .map((run) => map.get(run.task_id)?.module)
    .filter((module): module is LearningModule => typeof module === 'string');
}

export default withPlan('free', async function handler(req: NextApiRequest, res: NextApiResponse, ctx) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = ctx.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const plan = await fetchPlan(supabase, user.id);

  const [{ data: profileRow }, { data: signalRows }, { data: taskRows }, { data: runRows }] = await Promise.all([
    supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('learning_signals')
      .select('id, module, key, value, source, occurred_at')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('learning_tasks')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('task_runs')
      .select('task_id')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5),
  ]);

  const result = pickNextTask({
    plan,
    profile: (profileRow ?? null) as LearningProfileRow | null,
    signals: (signalRows ?? []) as LearningSignal[],
    tasks: (taskRows ?? []) as LearningTask[],
    recentModules: recentModulesFromRuns(runRows ?? [], (taskRows ?? []) as LearningTask[]),
  });

  if (!result) {
    const empty: NextTaskResponse = {
      recommendationId: null,
      task: null,
      reason: null,
      score: null,
      evidence: [],
    };
    return res.status(200).json(empty);
  }

  const insertion = await supabase
    .from('recommendations')
    .insert({
      user_id: user.id,
      task_id: result.task.id as string,
      reason: result.reason,
      score: result.score,
      status: 'shown',
    })
    .select('id')
    .single();

  if (insertion.error) {
    // eslint-disable-next-line no-console
    console.error('[reco] failed to insert recommendation', insertion.error);
    return res.status(500).json({ error: 'Failed to store recommendation' });
  }

  const { deeplink, title, summary } = safeMetadata(result.task);

  const response: NextTaskResponse = {
    recommendationId: insertion.data?.id ?? null,
    task: {
      id: result.task.id as string,
      slug: result.task.slug,
      module: result.task.module,
      type: result.task.type,
      estMinutes: result.task.est_minutes,
      difficulty: result.task.difficulty ?? null,
      tags: result.task.tags,
      minPlan: result.task.min_plan,
      deeplink,
      title,
      summary,
    },
    reason: result.reason,
    score: result.score,
    evidence: result.evidence,
  };

  return res.status(200).json(response);
});
