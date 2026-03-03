import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PlanId } from '@/types/pricing';

const normalisePlan = (value?: string | null): PlanId => {
  if (!value) return 'free';
  const lower = value.toLowerCase();
  if (lower === 'starter' || lower === 'booster' || lower === 'master') return lower;
  return 'free';
};

async function handler(req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Admin client not configured' });
    return;
  }

  const planFilter = req.query.plan as PlanId | 'all' | undefined;
  const searchQuery = (req.query.q as string | undefined)?.toLowerCase().trim();

  const { data: attempts, error: attemptsError } = await supabaseAdmin
    .from('exam_attempts')
    .select('id, user_id, submitted_at, updated_at')
    .order('submitted_at', { ascending: false })
    .limit(120);

  if (attemptsError) {
    res.status(500).json({ error: 'Failed to load attempts' });
    return;
  }

  const attemptList = attempts ?? [];

  let scopedAttempts = attemptList;
  if (ctx.role === 'teacher') {
    const { data: profileRow } = await ctx.supabase
      .from('profiles')
      .select('active_org_id')
      .eq('id', ctx.user.id)
      .maybeSingle();

    const activeOrgId = (profileRow?.active_org_id as string | null) ?? null;

    if (!activeOrgId) {
      scopedAttempts = [];
    } else {
      const { data: memberRows } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('org_id', activeOrgId);

      const allowed = new Set<string>((memberRows ?? []).map((row) => row.user_id as string));
      allowed.add(ctx.user.id);
      scopedAttempts = attemptList.filter((row) => allowed.has(row.user_id as string));
    }
  }

  const userIds = Array.from(new Set(scopedAttempts.map((row) => row.user_id as string)));

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  const profileMap = new Map<string, { full_name?: string | null; email?: string | null }>();
  (profiles ?? []).forEach((profile) => {
    profileMap.set(profile.id as string, profile as any);
  });

  const { data: subscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan_id, status, updated_at, created_at')
    .in('user_id', userIds)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false });

  const subscriptionPlanMap = new Map<string, PlanId>();
  (subscriptions ?? []).forEach((subscription) => {
    const userId = subscription.user_id as string | null;
    if (!userId || subscriptionPlanMap.has(userId)) return;
    subscriptionPlanMap.set(userId, normalisePlan(subscription.plan_id as string | null));
  });

  const attemptIds = scopedAttempts.map((row) => row.id as string);
  const { data: responses } = await supabaseAdmin
    .from('writing_responses')
    .select('exam_attempt_id, task, overall_band')
    .in('exam_attempt_id', attemptIds);

  const grouped = new Map<
    string,
    {
      sum: number;
      count: number;
      tasks: Array<{ task: string; band: number }>;
    }
  >();

  (responses ?? []).forEach((row) => {
    const attemptId = row.exam_attempt_id as string;
    if (!attemptId) return;
    const bucket = grouped.get(attemptId) ?? { sum: 0, count: 0, tasks: [] };
    const band = Number(row.overall_band ?? 0);
    bucket.sum += band;
    bucket.count += 1;
    if (row.task === 'task1' || row.task === 'task2') {
      bucket.tasks.push({ task: row.task, band });
    }
    grouped.set(attemptId, bucket);
  });

  const enriched = scopedAttempts.map((attempt) => {
    const profile = profileMap.get(attempt.user_id as string) ?? {};
    const stats = grouped.get(attempt.id as string) ?? { sum: 0, count: 0, tasks: [] };
    const averageBand = stats.count > 0 ? stats.sum / stats.count : 0;
    const plan = subscriptionPlanMap.get(attempt.user_id as string) ?? 'free';
    return {
      attemptId: attempt.id as string,
      userId: attempt.user_id as string,
      studentName: (profile.full_name as string | null) ?? null,
      email: (profile.email as string | null) ?? null,
      plan,
      averageBand,
      submittedAt: (attempt.submitted_at as string | null) ?? (attempt.updated_at as string | null) ?? null,
      tasks: stats.tasks,
    };
  });

  const filtered = enriched.filter((row) => {
    if (planFilter && planFilter !== 'all' && row.plan !== planFilter) return false;
    if (searchQuery) {
      const haystack = `${row.studentName ?? ''} ${row.email ?? ''} ${row.userId}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  res.status(200).json({ attempts: filtered, viewerPlan: ctx.plan });
}

export default withPlan('master', handler, { allowRoles: ['admin', 'teacher'] });
