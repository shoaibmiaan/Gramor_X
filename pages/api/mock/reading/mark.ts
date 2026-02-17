import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { normalizeText } from '@/lib/nlp/normalize';
import { readingBandFromRaw } from '@/lib/reading/band';

const AnswerSchema = z.object({
  value: z.string(),
  flagged: z.boolean().optional(),
});

const Body = z.object({
  attemptId: z.string().uuid(),
  mockId: z.string().min(1),
  answers: z.record(z.string(), AnswerSchema),
  durationSec: z.number().int().min(0).optional(),
  strict: z.boolean().optional(),
});

type ScoreResponse = {
  attemptId: string;
  correct: number;
  total: number;
  percentage: number;
  band: number;
};

type ReadingKeyRow = {
  question_id?: string | null;
  acceptable?: unknown;
  strict?: boolean | null;
};

const toStrict = (value: string) => value.trim().toLowerCase();

export default async function handler(req: NextApiRequest, res: NextApiResponse<ScoreResponse | { error: string; details?: unknown }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const { attemptId, mockId, answers, durationSec, strict } = parse.data;
  const supabase = getServerClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return res.status(500).json({ error: 'Failed to resolve user session' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: keys, error: keysError } = await supabase
    .from('reading_keys')
    .select('question_id, acceptable, strict')
    .eq('attempt_id', attemptId);

  if (keysError) {
    return res.status(500).json({ error: 'Failed to load keys' });
  }

  if (!keys || keys.length === 0) {
    return res.status(404).json({ error: 'No answer keys found for attempt' });
  }

  const expected = new Map<
    string,
    { normalized: Set<string>; strictNormalized: Set<string>; strict: boolean }
  >();

  for (const row of keys as ReadingKeyRow[]) {
    const questionId = typeof row?.question_id === 'string' ? row.question_id : String(row?.question_id ?? '');
    if (!questionId) continue;

    const acceptableRaw = Array.isArray(row?.acceptable) ? (row.acceptable as unknown[]) : [];
    const normalizedValues = acceptableRaw
      .map((item) => normalizeText(String(item ?? '')))
      .filter((value) => value.length > 0);
    const strictValues = acceptableRaw
      .map((item) => toStrict(String(item ?? '')))
      .filter((value) => value.length > 0);

    expected.set(questionId, {
      normalized: new Set(normalizedValues),
      strictNormalized: new Set(strictValues),
      strict: row?.strict === true,
    });
  }

  let correct = 0;
  const total = expected.size;

  for (const [questionId, spec] of expected.entries()) {
    const answer = answers[questionId];
    if (!answer) continue;

    const raw = typeof answer?.value === 'string' ? answer.value : '';
    const useStrict = spec.strict || Boolean(strict);
    const normalizedAnswer = useStrict ? toStrict(raw) : normalizeText(raw);
    const acceptable = useStrict ? spec.strictNormalized : spec.normalized;
    if (normalizedAnswer && acceptable.has(normalizedAnswer)) {
      correct += 1;
    }
  }

  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.round((correct / safeTotal) * 100);
  const band = readingBandFromRaw(correct, total);

  const { error: upsertError } = await supabase
    .from('attempts_reading')
    .upsert(
      {
        id: attemptId,
        user_id: user.id,
        paper_id: mockId,
        score_json: {
          answers,
          correct,
          total,
          percentage,
          duration_sec: typeof durationSec === 'number' ? durationSec : null,
          band,
        },
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (upsertError) {
    return res.status(500).json({ error: 'Failed to save attempt' });
  }

  return res.status(200).json({ attemptId, correct, total, percentage, band });
}
