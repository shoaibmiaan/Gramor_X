import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { getActiveDayISO } from '@/lib/daily-learning-time';
import { getVocabWordById } from '@/lib/vocabulary/today';
import { awardVocabXp, baseXpForMeaning } from '@/lib/gamification/xp';
import { trackor } from '@/lib/analytics/trackor.server';

const ChoiceSchema = z.union([
  z.string().min(1),
  z.object({
    id: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    value: z.string().min(1).optional(),
    correct: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
  }),
]);

const BodySchema = z.object({
  wordId: z.string().uuid('wordId must be a valid uuid'),
  choice: ChoiceSchema,
  timeMs: z.coerce.number().int().min(0).max(600_000),
});

type Choice = z.infer<typeof ChoiceSchema>;

type MeaningAttemptResponse = { correct: boolean; xpAwarded: number };

type ErrorResponse = { error: string };

function extractChoiceText(choice: Choice): string {
  if (typeof choice === 'string') return choice;
  return choice.value || choice.label || choice.text || '';
}

function extractChoiceFlag(choice: Choice): boolean | undefined {
  if (typeof choice === 'string') return undefined;
  if (typeof choice.correct === 'boolean') return choice.correct;
  if (typeof choice.isCorrect === 'boolean') return choice.isCorrect;
  return undefined;
}

function normaliseAnswer(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandMeaning(raw: string): string[] {
  const text = normaliseAnswer(raw);
  if (!text) return [];
  const parts = raw
    .split(/[;\n]+|\bor\b|\/|,/i)
    .map((part) => normaliseAnswer(part))
    .filter((part) => part.length > 0);
  return parts.length > 0 ? Array.from(new Set(parts)) : [text];
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeaningAttemptResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { wordId, choice, timeMs } = parsed.data;

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const vocabWord = await getVocabWordById(wordId);
  if (!vocabWord) {
    return res.status(404).json({ error: 'Word not found' });
  }

  const choiceText = extractChoiceText(choice);
  const explicitFlag = extractChoiceFlag(choice);
  const normalisedChoice = normaliseAnswer(choiceText);

  const accepted = new Set<string>();
  expandMeaning(vocabWord.meaning).forEach((item) => accepted.add(item));
  expandMeaning(vocabWord.definition).forEach((item) => accepted.add(item));
  vocabWord.synonyms.forEach((syn) => {
    const norm = normaliseAnswer(syn);
    if (norm) accepted.add(norm);
  });

  let correct = typeof explicitFlag === 'boolean' ? explicitFlag : false;
  if (typeof explicitFlag !== 'boolean') {
    if (normalisedChoice) {
      if (accepted.has(normalisedChoice)) {
        correct = true;
      } else if (normalisedChoice.startsWith('to ')) {
        const trimmed = normalisedChoice.replace(/^to\s+/, '');
        if (accepted.has(trimmed)) correct = true;
      }
    }
  }

  const todayISO = getActiveDayISO();
  const { error: logError } = await supabase.from('user_word_logs').upsert(
    {
      user_id: user.id,
      word_id: wordId,
      learned_on: todayISO,
    },
    { onConflict: 'user_id,learned_on' },
  );

  if (logError) {
    console.error('[api/vocab/attempt/meaning] log upsert failed', logError);
    return res.status(500).json({ error: 'Failed to record progress' });
  }

  const { data: statsRow, error: statsError } = await supabase
    .from('user_word_stats')
    .select('status, streak_correct')
    .eq('user_id', user.id)
    .eq('word_id', wordId)
    .maybeSingle();

  if (statsError) {
    console.error('[api/vocab/attempt/meaning] stats load failed', statsError);
    return res.status(500).json({ error: 'Failed to update stats' });
  }

  const nowIso = new Date().toISOString();
  const previousStreak = statsRow?.streak_correct ?? 0;
  const nextStreak = correct ? previousStreak + 1 : 0;
  const status = correct ? 'learning' : (statsRow?.status ?? 'new');

  if (statsRow) {
    const { error: updateError } = await supabase
      .from('user_word_stats')
      .update({
        status,
        streak_correct: nextStreak,
        last_result: correct ? 'pass' : 'fail',
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', user.id)
      .eq('word_id', wordId);

    if (updateError) {
      console.error('[api/vocab/attempt/meaning] stats update failed', updateError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }
  } else {
    const { error: insertError } = await supabase.from('user_word_stats').insert({
      user_id: user.id,
      word_id: wordId,
      status,
      streak_correct: correct ? 1 : 0,
      last_result: correct ? 'pass' : 'fail',
      last_seen_at: nowIso,
    });

    if (insertError) {
      console.error('[api/vocab/attempt/meaning] stats insert failed', insertError);
      return res.status(500).json({ error: 'Failed to initialise stats' });
    }
  }

  const baseXp = baseXpForMeaning(correct);

  let xpAwarded = 0;
  try {
    const result = await awardVocabXp({
      client: supabase,
      userId: user.id,
      baseAmount: baseXp,
      kind: 'meaning',
      meta: {
        wordId,
        correct,
        timeMs,
        choice: normalisedChoice || choiceText,
      },
      logEvenIfZero: true,
    });
    xpAwarded = result.awarded;

    await trackor.log('vocab_meaning_submitted', {
      user_id: user.id,
      word_id: wordId,
      correct,
      xp_awarded: result.awarded,
      xp_requested: result.requested,
      multiplier: result.multiplier,
      capped: result.capped,
      time_ms: timeMs,
      day_iso: result.dayIso,
    });
  } catch (error) {
    console.error('[api/vocab/attempt/meaning] xp award failed', error);
    return res.status(500).json({ error: 'Failed to record XP' });
  }

  return res.status(200).json({ correct, xpAwarded });
}

export default withPlan('free', handler);
