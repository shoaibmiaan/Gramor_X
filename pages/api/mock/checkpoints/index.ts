import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const postSchema = z.object({
  attemptId: z.string().min(1),
  sectionIndex: z.number().int().min(0),
  snapshot: z.unknown(),
  mockId: z.string().min(1).optional(),
  elapsedSeconds: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  answers_delta: z.record(z.string(), z.unknown()).optional(),
});

const querySchema = z.object({
  attemptId: z.string().min(1).optional(),
  sectionIndex: z.coerce.number().int().min(0).optional(),
  mockId: z.string().min(1).optional(),
  includeCompleted: z.enum(['true']).optional(),
  latest: z.enum(['true']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

type CheckpointRow = {
  id: number;
  attempt_id: string;
  user_id: string;
  section_idx: number;
  mock_id: string | null;
  snapshot: unknown;
  elapsed_sec: number | null;
  duration_sec: number | null;
  completed: boolean | null;
  created_at: string;
};

const mapRow = (row: CheckpointRow) => ({
  attemptId: row.attempt_id,
  sectionIndex: row.section_idx,
  mockId: row.mock_id ?? null,
  snapshot: row.snapshot ?? {},
  elapsedSeconds: typeof row.elapsed_sec === 'number' ? row.elapsed_sec : 0,
  durationSeconds: typeof row.duration_sec === 'number' ? row.duration_sec : null,
  completed: Boolean(row.completed),
  createdAt: row.created_at,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    return res.status(500).json({ ok: false, error: authError.message });
  }
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }
    const {
      attemptId,
      sectionIndex,
      snapshot,
      elapsedSeconds,
      durationSeconds,
      completed,
      mockId,
      occurredAt,
      answers_delta: answersDelta,
    } = parsed.data;

    let mergedSnapshot: Record<string, unknown> = isRecord(snapshot) ? { ...snapshot } : {};

    if (answersDelta && Object.keys(answersDelta).length > 0) {
      let mergedAnswers: Record<string, unknown> = {};

      const snapshotAnswers = mergedSnapshot['answers'];
      if (isRecord(snapshotAnswers)) {
        mergedAnswers = { ...snapshotAnswers };
      }

      const { data: previousRow, error: previousError } = await supabase
        .from('mock_checkpoints')
        .select('snapshot')
        .eq('user_id', user.id)
        .eq('attempt_id', attemptId)
        .eq('section_idx', sectionIndex)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ snapshot: unknown }>();

      if (previousError) {
        return res.status(500).json({ ok: false, error: previousError.message });
      }

      if (previousRow?.snapshot && isRecord(previousRow.snapshot)) {
        const previousAnswers = previousRow.snapshot['answers'];
        if (isRecord(previousAnswers)) {
          mergedAnswers = { ...previousAnswers, ...mergedAnswers };
        }
      }

      mergedSnapshot = {
        ...mergedSnapshot,
        answers: { ...mergedAnswers, ...answersDelta },
      };
    }

    const payload = {
      attempt_id: attemptId,
      user_id: user.id,
      section_idx: sectionIndex,
      mock_id: mockId ?? null,
      snapshot: mergedSnapshot,
      elapsed_sec: elapsedSeconds ?? 0,
      duration_sec: durationSeconds ?? null,
      completed: Boolean(completed),
      created_at: occurredAt ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('mock_checkpoints')
      .insert(payload)
      .select('attempt_id, section_idx, mock_id, snapshot, elapsed_sec, duration_sec, completed, created_at')
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, checkpoint: mapRow(data as CheckpointRow) });
  }

  if (req.method === 'GET') {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Invalid query' });
    }
    const { attemptId, sectionIndex, mockId, includeCompleted, latest, limit } = parsed.data;

    let query = supabase
      .from('mock_checkpoints')
      .select('attempt_id, section_idx, mock_id, snapshot, elapsed_sec, duration_sec, completed, created_at')
      .eq('user_id', user.id);

    if (attemptId) {
      query = query.eq('attempt_id', attemptId);
    }
    if (typeof sectionIndex === 'number') {
      query = query.eq('section_idx', sectionIndex);
    }
    if (mockId) {
      query = query.eq('mock_id', mockId);
    }
    if (!includeCompleted) {
      query = query.eq('completed', false);
    }

    const shouldReturnLatest = latest !== undefined ? latest === 'true' : true;
    if (shouldReturnLatest) {
      query = query.order('created_at', { ascending: false }).limit(1);
    } else if (limit) {
      query = query.order('created_at', { ascending: false }).limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const checkpoints = Array.isArray(data) ? data.map((row) => mapRow(row as CheckpointRow)) : [];
    const payload = shouldReturnLatest ? { ok: true, checkpoint: checkpoints[0] ?? null } : { ok: true, checkpoints };
    return res.status(200).json(payload);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
