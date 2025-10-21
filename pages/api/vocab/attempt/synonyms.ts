import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { computeSynonymRound, awardVocabXp } from '@/lib/gamification/xp';
import { trackor } from '@/lib/analytics/trackor.server';

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

  const round = computeSynonymRound({
    totalTargets: parsed.data.total,
    netCorrect: parsed.data.correct,
    timeMs: parsed.data.timeMs,
  });
  let xpAwarded = round.baseXp;

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
  const pass = round.accuracy >= 0.7;

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

  try {
    const result = await awardVocabXp({
      client: supabase,
      userId: user.id,
      baseAmount: round.baseXp,
      kind: 'synonyms',
      meta: {
        wordId,
        total: parsed.data.total,
        netCorrect: parsed.data.correct,
        timeMs: parsed.data.timeMs,
        score: round.score,
        accuracy: round.accuracy,
      },
      logEvenIfZero: true,
    });
    xpAwarded = result.awarded;

    await trackor.log('vocab_synonyms_submitted', {
      user_id: user.id,
      word_id: wordId,
      score: round.score,
      accuracy: round.accuracy,
      xp_awarded: result.awarded,
      xp_requested: result.requested,
      multiplier: result.multiplier,
      capped: result.capped,
      time_ms: parsed.data.timeMs,
      day_iso: result.dayIso,
    });
  } catch (error) {
    console.error('[api/vocab/attempt/synonyms] xp award failed', error);
    return res.status(500).json({ error: 'Failed to record XP' });
  }

  return res.status(200).json({ score: round.score, accuracy: round.accuracy, xpAwarded });
}

export default withPlan('free', handler);
