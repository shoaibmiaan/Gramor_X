import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import type { AttemptProgressRecord } from '@/types/api/progress';
import type { ModuleKey } from '@/types/attempts';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const moduleSchema = z.enum(['listening', 'reading', 'writing', 'speaking']);

const querySchema = z.object({
  module: moduleSchema.optional(),
  includeCompleted: z.enum(['true']).optional(),
  mockId: z.string().min(1).optional(),
});

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid query' });
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

  const { module, includeCompleted, mockId } = parsed.data;

  let query = supabase
    .from('attempt_progress')
    .select('attempt_id, module, payload, context, elapsed_sec, duration_sec, completed, draft_updated_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
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

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(200).json({ ok: true, progress: null });
  }

  return res.status(200).json({ ok: true, progress: toRecord(data[0] as Record<string, unknown>) });
}
