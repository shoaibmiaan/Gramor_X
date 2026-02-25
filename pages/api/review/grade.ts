import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { isVocabMastered, scheduleReview, vocabIntervalDaysForRepetitions } from '@/lib/spaced-repetition';
import type { ReviewGradeResponse, ReviewItemType } from '@/types/review';
import type { ReviewQueue, UserWordStats } from '@/types/supabase';

const DEFAULT_EASE_FACTOR = 2.3;
const EASE_DELTA: Record<1 | 2 | 3 | 4, number> = {
  1: -0.3,
  2: -0.05,
  3: 0.05,
  4: 0.15,
};

async function resolveWordId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  itemType: ReviewItemType,
  itemId: string,
) {
  if (itemType === 'word') return itemId;

  const table = itemType === 'collocation' ? 'word_collocations' : 'word_examples';
  const { data, error } = await supabase
    .from(table)
    .select('word_id')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    console.error('[review/grade] resolve word error', { itemType, itemId, error });
    throw new Error('Failed to resolve word');
  }

  if (!data) {
    throw new Error('Item not found');
  }

  return data.word_id as string;
}

function computeEaseFactor(prev: number | null | undefined, ease: 1 | 2 | 3 | 4): number {
  const base = typeof prev === 'number' && !Number.isNaN(prev) ? prev : DEFAULT_EASE_FACTOR;
  const next = Math.max(1.3, base + EASE_DELTA[ease]);
  return Number.isFinite(next) ? Number(next.toFixed(2)) : DEFAULT_EASE_FACTOR;
}

function nextStatus(isPass: boolean, mastered: boolean, hadStats: boolean): UserWordStats['status'] {
  if (!isPass && !hadStats) return 'new';
  if (mastered) return 'mastered';
  if (!isPass) return 'learning';
  return 'learning';
}

async function fetchQueueEntry(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  itemType: ReviewItemType,
  itemId: string,
) {
  const { data, error } = await supabase
    .from('review_queue')
    .select('item_type, item_ref_id, priority')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_ref_id', itemId)
    .maybeSingle();

  if (error) {
    console.error('[review/grade] queue fetch error', error);
    throw new Error('Failed to load queue item');
  }

  return data ?? null;
}

type QueueSlice = Pick<ReviewQueue, 'item_type' | 'item_ref_id' | 'due_at' | 'priority'>;

function buildResponse(queue: QueueSlice, stats: UserWordStats, mastery: boolean): ReviewGradeResponse {
  return {
    success: true,
    stats: {
      word_id: stats.word_id,
      status: stats.status,
      streak_correct: stats.streak_correct,
      interval_days: stats.interval_days,
      ef: stats.ef,
      ease: stats.ease,
      last_seen_at: stats.last_seen_at ?? new Date().toISOString(),
      next_due_at: stats.next_due_at ?? new Date().toISOString(),
      pron_attempts: stats.pron_attempts ?? 0,
      writing_attempts: (stats as any).writing_attempts ?? 0,
      reading_attempts: (stats as any).reading_attempts ?? 0,
      listening_attempts: (stats as any).listening_attempts ?? 0,
    },
    mastery,
    queue,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReviewGradeResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { item_type: itemType, item_id: itemId, ease } = req.body as {
    item_type?: ReviewItemType;
    item_id?: string;
    ease?: number;
  };

  if (!itemType || !['word', 'collocation', 'gap'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type' });
  }

  if (typeof itemId !== 'string' || itemId.length === 0) {
    return res.status(400).json({ error: 'Missing item id' });
  }

  if (![1, 2, 3, 4].includes(Number(ease))) {
    return res.status(400).json({ error: 'Invalid ease grade' });
  }

  const easeValue = Number(ease) as 1 | 2 | 3 | 4;

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const wordId = await resolveWordId(supabase, itemType, itemId);

    const { data: statsRow, error: statsError } = await supabase
      .from('user_word_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (statsError) {
      console.error('[review/grade] stats load error', statsError);
      return res.status(500).json({ error: 'Failed to load stats' });
    }

    const hadStats = !!statsRow;
    const isPass = easeValue > 1;
    const prevStreak = statsRow?.streak_correct ?? 0;
    const streak = isPass ? prevStreak + 1 : 0;
    const intervalDays = isPass ? vocabIntervalDaysForRepetitions(streak) : 0;
    const nextDue = isPass ? scheduleReview(streak) : new Date();
    const ef = computeEaseFactor(statsRow?.ef, easeValue);

    const mastery = isPass && isVocabMastered(streak);
    const status = nextStatus(isPass, mastery, hadStats);

    const nowIso = new Date().toISOString();

    const { data: upserted, error: upsertErr } = await supabase
      .from('user_word_stats')
      .upsert(
        {
          user_id: user.id,
          word_id: wordId,
          status,
          ef,
          streak_correct: streak,
          last_result: isPass ? 'pass' : 'fail',
          last_seen_at: nowIso,
          next_due_at: nextDue.toISOString(),
          interval_days: intervalDays,
          ease: easeValue,
        },
        { onConflict: 'user_id,word_id' },
      )
      .select('*')
      .maybeSingle();

    if (upsertErr || !upserted) {
      console.error('[review/grade] stats upsert error', upsertErr);
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    const queueRow = await fetchQueueEntry(supabase, user.id, itemType, itemId);
    const newDueIso = isPass ? nextDue.toISOString() : nowIso;
    const newPriority = queueRow
      ? easeValue === 1
        ? Math.max(queueRow.priority + 1, 1)
        : Math.max(queueRow.priority - 1, 0)
      : easeValue === 1
      ? 1
      : 0;

    const { data: queueUpsert, error: queueErr } = await supabase
      .from('review_queue')
      .upsert(
        {
          user_id: user.id,
          item_type: itemType,
          item_ref_id: itemId,
          due_at: newDueIso,
          priority: newPriority,
        },
        { onConflict: 'user_id,item_type,item_ref_id' },
      )
      .select('item_type, item_ref_id, due_at, priority')
      .maybeSingle();

    if (queueErr || !queueUpsert) {
      console.error('[review/grade] queue upsert error', queueErr);
      return res.status(500).json({ error: 'Failed to update queue' });
    }

    return res.status(200).json(buildResponse(queueUpsert as QueueSlice, upserted as UserWordStats, mastery));
  } catch (err: any) {
    if (err instanceof Error && err.message === 'Item not found') {
      return res.status(404).json({ error: 'Item not found' });
    }
    console.error('[review/grade] fatal error', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
