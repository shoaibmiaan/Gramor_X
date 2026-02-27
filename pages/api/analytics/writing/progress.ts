// pages/api/analytics/writing/progress.ts
// Returns the most recent writing attempts with band deltas for trend charts.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { computeCriterionDeltas, trimProgressPoints } from '@/lib/writing/progress';
import type { WritingProgressPoint } from '@/types/analytics';
import type { WritingCriterion } from '@/types/writing';

const CRITERIA: WritingCriterion[] = [
  'task_response',
  'coherence_and_cohesion',
  'lexical_resource',
  'grammatical_range',
];

type WorkingPoint = WritingProgressPoint & { _count: number };

const ok = (res: NextApiResponse, payload: Record<string, unknown>) => res.status(200).json(payload);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: rows, error } = await supabase
    .from('writing_responses')
    .select('exam_attempt_id, overall_band, band_scores, submitted_at, created_at')
    .eq('user_id', user.id)
    .not('exam_attempt_id', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[analytics/writing/progress] query failed', error);
    return res.status(500).json({ error: 'Failed to load progress' });
  }

  const attempts = new Map<string, WorkingPoint>();

  for (const row of rows ?? []) {
    const attemptId = row.exam_attempt_id as string | null;
    if (!attemptId) continue;
    const bands = (row.band_scores as Record<string, number> | null) ?? {};
    const point =
      attempts.get(attemptId) ?? ({
        attemptId,
        createdAt: row.submitted_at ?? row.created_at ?? new Date().toISOString(),
        overallBand: 0,
        bandScores: {
          task_response: 0,
          coherence_and_cohesion: 0,
          lexical_resource: 0,
          grammatical_range: 0,
        },
        _count: 0,
      } satisfies WorkingPoint);

    point.overallBand += Number(row.overall_band ?? 0);
    point._count = (point._count ?? 0) + 1;

    CRITERIA.forEach((criterion) => {
      const value = Number(bands?.[criterion] ?? 0);
      point.bandScores[criterion] = (point.bandScores[criterion] ?? 0) + value;
    });

    attempts.set(attemptId, point);
  }

  const points: WritingProgressPoint[] = Array.from(attempts.values()).map((point) => {
    const count = point._count ?? 1;
    return {
      attemptId: point.attemptId,
      createdAt: point.createdAt,
      overallBand: Number((point.overallBand / count).toFixed(1)),
      bandScores: {
        task_response: Number((point.bandScores.task_response / count).toFixed(1)),
        coherence_and_cohesion: Number((point.bandScores.coherence_and_cohesion / count).toFixed(1)),
        lexical_resource: Number((point.bandScores.lexical_resource / count).toFixed(1)),
        grammatical_range: Number((point.bandScores.grammatical_range / count).toFixed(1)),
      },
    } satisfies WritingProgressPoint;
  });

  const trimmed = trimProgressPoints(points, 3);
  const deltas = computeCriterionDeltas(trimmed);

  return ok(res, {
    ok: true,
    points: trimmed,
    deltas,
  });
}
