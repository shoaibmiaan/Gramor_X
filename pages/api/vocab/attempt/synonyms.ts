import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';

const BodySchema = z.object({
  wordId: z.string().uuid('wordId must be a valid uuid'),
  total: z.coerce.number().int().min(1).max(30),
  correct: z.coerce.number().int().min(0),
  timeMs: z.coerce.number().int().min(0).max(600_000),
});

type Body = z.infer<typeof BodySchema>;

type SynonymAttemptResponse = {
  score: number;
  accuracy: number;
  xpAwarded: number;
};

type ErrorResponse = { error: string };

function computeScore(body: Body) {
  const accuracy = body.correct <= 0 ? 0 : Math.min(body.correct / body.total, 1);
  const cappedTime = Math.max(1, Math.min(body.timeMs, 180_000));
  const speed =
    cappedTime <= 20_000 ? 1 : cappedTime <= 40_000 ? 0.7 : cappedTime <= 60_000 ? 0.45 : 0.2;
  const composite = Math.min(1, accuracy * 0.7 + speed * 0.3);
  const score = Math.round(composite * 100);
  const xpAwarded = Math.min(10, Math.max(0, Math.round(composite * 10)));
  return { score, accuracy, xpAwarded };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SynonymAttemptResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { wordId } = parsed.data;

  if (parsed.data.correct > parsed.data.total) {
    return res.status(400).json({ error: 'correct cannot exceed total' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { score, accuracy, xpAwarded } = computeScore(parsed.data);

  const { data: statsRow, error: statsError } = await supabase
    .from('user_word_stats')
    .select('status')
    .eq('user_id', user.id)
    .eq('word_id', wordId)
    .maybeSingle();

  if (statsError) {
    console.error('[api/vocab/attempt/synonyms] stats load failed', statsError);
    return res.status(500).json({ error: 'Failed to update stats' });
  }

  const nowIso = new Date().toISOString();
  const pass = accuracy >= 0.7;

  if (statsRow) {
    const { error: updateError } = await supabase
      .from('user_word_stats')
      .update({
        status: pass ? 'learning' : (statsRow.status ?? 'new'),
        last_result: pass ? 'pass' : 'fail',
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', user.id)
      .eq('word_id', wordId);

    if (updateError) {
      console.error('[api/vocab/attempt/synonyms] stats update failed', updateError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }
  } else {
    const { error: insertError } = await supabase.from('user_word_stats').insert({
      user_id: user.id,
      word_id: wordId,
      status: pass ? 'learning' : 'new',
      last_result: pass ? 'pass' : 'fail',
      last_seen_at: nowIso,
    });

    if (insertError) {
      console.error('[api/vocab/attempt/synonyms] stats insert failed', insertError);
      return res.status(500).json({ error: 'Failed to initialise stats' });
    }
  }

  const { error: xpError } = await supabase.from('xp_events').insert({
    user_id: user.id,
    source: 'vocab',
    amount: xpAwarded,
    meta: {
      kind: 'synonyms',
      wordId,
      total: parsed.data.total,
      correct: parsed.data.correct,
      timeMs: parsed.data.timeMs,
      score,
    },
  });

  if (xpError) {
    console.error('[api/vocab/attempt/synonyms] xp insert failed', xpError);
    return res.status(500).json({ error: 'Failed to record XP' });
  }

  return res.status(200).json({ score, accuracy, xpAwarded });
}

export default withPlan('free', handler);
