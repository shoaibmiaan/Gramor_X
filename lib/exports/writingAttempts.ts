// lib/exports/writingAttempts.ts
// Helper utilities shared by export endpoints and offline jobs to assemble
// organization-aware writing attempt datasets. Centralises filtering logic so
// both CSV and Parquet outputs stay consistent.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { coercePlanId, type PlanId } from '@/types/pricing';

export type WritingAttemptExportRow = Readonly<{
  attemptId: string;
  userId: string;
  studentName: string | null;
  email: string | null;
  plan: PlanId;
  orgIds: string[];
  submittedAt: string | null;
  goalBand: number | null;
  averageBand: number | null;
  task1Band: number | null;
  task2Band: number | null;
}>;

export type LoadAttemptOptions = Readonly<{
  limit?: number;
  orgId?: string | null;
  userIds?: string[];
  includeUserIds?: string[];
}>;

type AttemptRow = {
  id: string;
  user_id: string;
  submitted_at: string | null;
  updated_at: string | null;
  goal_band: number | null;
};

type ResponseRow = {
  exam_attempt_id: string;
  task: string | null;
  overall_band: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string | null;
};

const DEFAULT_LIMIT = 10_000;

function normaliseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseTaskBand(responses: ResponseRow[], attemptId: string, task: string): number | null {
  const row = responses.find((response) => response.exam_attempt_id === attemptId && response.task === task);
  return row ? normaliseNumber(row.overall_band) : null;
}

function computeAverageBand(responses: ResponseRow[], attemptId: string): number | null {
  const relevant = responses.filter((row) => row.exam_attempt_id === attemptId);
  if (relevant.length === 0) return null;
  const sum = relevant.reduce((total, row) => total + (normaliseNumber(row.overall_band) ?? 0), 0);
  const avg = sum / relevant.length;
  return Number.isFinite(avg) ? Number(avg.toFixed(2)) : null;
}

export async function loadWritingAttemptRows(options: LoadAttemptOptions = {}): Promise<WritingAttemptExportRow[]> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), DEFAULT_LIMIT);

  const scopedUserIds = new Set<string>(options.userIds ?? []);
  for (const extra of options.includeUserIds ?? []) {
    scopedUserIds.add(extra);
  }

  if (options.orgId) {
    const { data: memberRows, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('org_id', options.orgId)
      .limit(DEFAULT_LIMIT * 2);

    if (memberError) {
      console.error('[exports] failed to load org members', memberError);
      return [];
    }

    for (const member of memberRows ?? []) {
      if (member?.user_id) scopedUserIds.add(member.user_id);
    }
  }

  const userFilter = scopedUserIds.size > 0 ? Array.from(scopedUserIds) : undefined;

  const attemptsQuery = supabaseAdmin
    .from('exam_attempts')
    .select('id, user_id, submitted_at, updated_at, goal_band')
    .eq('exam_type', 'writing')
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (userFilter && userFilter.length > 0) {
    attemptsQuery.in('user_id', userFilter);
  }

  const { data: attemptRows, error: attemptError } = await attemptsQuery;

  if (attemptError) {
    console.error('[exports] failed to load exam attempts', attemptError);
    return [];
  }

  const attempts = (attemptRows ?? []).filter((row): row is AttemptRow => Boolean(row?.id && row?.user_id));
  if (attempts.length === 0) return [];

  const attemptIds = attempts.map((row) => row.id);
  const userIds = Array.from(new Set(attempts.map((row) => row.user_id)));

  const [{ data: responseRows }, { data: profileRows }, { data: membershipRows }] = await Promise.all([
    supabaseAdmin
      .from('writing_responses')
      .select('exam_attempt_id, task, overall_band')
      .in('exam_attempt_id', attemptIds),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, plan')
      .in('id', userIds),
    supabaseAdmin
      .from('organization_members')
      .select('user_id, org_id')
      .in('user_id', userIds),
  ]);

  const responses = (responseRows ?? []).filter((row): row is ResponseRow => Boolean(row?.exam_attempt_id));
  const profiles = new Map<string, ProfileRow>();
  (profileRows ?? []).forEach((row) => {
    if (row?.id) profiles.set(row.id, row as ProfileRow);
  });

  const orgMap = new Map<string, string[]>();
  (membershipRows ?? []).forEach((row) => {
    if (!row?.user_id || !row?.org_id) return;
    const existing = orgMap.get(row.user_id) ?? [];
    if (!existing.includes(row.org_id)) existing.push(row.org_id);
    orgMap.set(row.user_id, existing);
  });

  return attempts.map((attempt) => {
    const profile = profiles.get(attempt.user_id) ?? null;
    const studentName = profile?.full_name ?? null;
    const email = profile?.email ?? null;
    const plan = coercePlanId(profile?.plan ?? null);
    const averageBand = computeAverageBand(responses, attempt.id);
    const task1Band = normaliseTaskBand(responses, attempt.id, 'task1');
    const task2Band = normaliseTaskBand(responses, attempt.id, 'task2');
    const submittedAt = attempt.submitted_at ?? attempt.updated_at ?? null;

    return {
      attemptId: attempt.id,
      userId: attempt.user_id,
      studentName,
      email,
      plan,
      orgIds: orgMap.get(attempt.user_id) ?? [],
      submittedAt,
      goalBand: normaliseNumber(attempt.goal_band),
      averageBand,
      task1Band,
      task2Band,
    } satisfies WritingAttemptExportRow;
  });
}
