import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import type { AttemptProgressRecord } from '@/types/api/progress';
import type { ModuleKey } from '@/types/attempts';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const moduleSchema = z.enum(['listening', 'reading', 'writing', 'speaking']);

const bodySchema = z.object({
  module: moduleSchema,
  draft: z.unknown().default({}),
  elapsedSeconds: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  completed: z.boolean().optional(),
  context: z.record(z.unknown()).optional(),
  draftUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

const querySchema = z.object({
  module: moduleSchema.optional(),
  includeCompleted: z.enum(['true']).optional(),
  mockId: z.string().min(1).optional(),
});

const clampSeconds = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const n = Math.max(0, Math.round(value));
  return n;
};

const toRecord = (row: Record<string, unknown>): AttemptProgressRecord => ({
  attemptId: String(row.attempt_id ?? ''),
  module: row.module as ModuleKey,
  draft: (row.payload as unknown) ?? {},
  elapsedSeconds: typeof row.elapsed_sec === 'number' ? row.elapsed_sec : null,
  durationSeconds: typeof row.duration_sec === 'number' ? row.duration_sec : null,
  completed: Boolean(row.completed),
  context: (row.context as Record<string, unknown>) ?? {},
  draftUpdatedAt: typeof row.draft_updated_at === 'string' ? row.draft_updated_at : new Date().toISOString(),
  updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const attemptId = req.query.id;
  if (typeof attemptId !== 'string' || !attemptId.trim()) {
    return res.status(400).json({ ok: false, error: 'Invalid attempt id' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return res.status(500).json({ ok: false, error: authError.message });
  }
  const userId = authData?.user?.id;
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  if (req.method === 'PUT') {
    return putHandler({ req, res, attemptId, userId });
  }
  if (req.method === 'GET') {
    return getHandler({ req, res, attemptId, userId });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}

async function putHandler({
  req,
  res,
  attemptId,
  userId,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  attemptId: string;
  userId: string;
}) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }
  const { module, draft, elapsedSeconds, durationSeconds, completed, context, draftUpdatedAt } = parsed.data;
  const supabase = createSupabaseServerClient({ req, res });

  const payload = {
    attempt_id: attemptId,
    user_id: userId,
    module,
    payload: draft ?? {},
    context: context ?? {},
    elapsed_sec: clampSeconds(elapsedSeconds ?? undefined) ?? 0,
    duration_sec: clampSeconds(durationSeconds ?? undefined),
    completed: Boolean(completed),
    draft_updated_at: draftUpdatedAt ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('attempt_progress')
    .upsert(payload, { onConflict: 'attempt_id' })
    .select('attempt_id, module, payload, context, elapsed_sec, duration_sec, completed, draft_updated_at, updated_at')
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, progress: toRecord(data ?? payload) });
}

async function getHandler({
  req,
  res,
  attemptId,
  userId,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  attemptId: string;
  userId: string;
}) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid query' });
  }
  const { module, includeCompleted, mockId } = parsed.data;
  const supabase = createSupabaseServerClient({ req, res });

  let query = supabase
    .from('attempt_progress')
    .select('attempt_id, module, payload, context, elapsed_sec, duration_sec, completed, draft_updated_at, updated_at')
    .eq('user_id', userId)
    .eq('attempt_id', attemptId)
    .limit(1);

  if (module) {
    query = query.eq('module', module);
  }
  if (!includeCompleted) {
    query = query.eq('completed', false);
  }
  if (mockId) {
    query = query.contains('context', { mockId });
  }

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ ok: false, error: error.message });
  }
  if (!data) {
    return res.status(200).json({ ok: true, progress: null });
  }

  return res.status(200).json({ ok: true, progress: toRecord(data) });
}
