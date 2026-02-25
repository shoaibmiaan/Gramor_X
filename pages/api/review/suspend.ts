import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ReviewItemType, ReviewSuspendResponse } from '@/types/review';

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
    console.error('[review/suspend] resolve error', error);
    throw new Error('Failed to resolve word');
  }

  if (!data) {
    throw new Error('Item not found');
  }

  return data.word_id as string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReviewSuspendResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { item_type: itemType, item_id: itemId } = req.body as {
    item_type?: ReviewItemType;
    item_id?: string;
  };

  if (!itemType || !['word', 'collocation', 'gap'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type' });
  }

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Missing item id' });
  }

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

    const { error: statsErr } = await supabase
      .from('user_word_stats')
      .upsert(
        {
          user_id: user.id,
          word_id: wordId,
          status: 'suspended',
          ef: 1.5,
          streak_correct: 0,
          last_result: 'fail',
          next_due_at: null,
          interval_days: 0,
          ease: 1,
        },
        { onConflict: 'user_id,word_id' },
      );

    if (statsErr) {
      console.error('[review/suspend] stats error', statsErr);
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    const { error: deleteErr } = await supabase
      .from('review_queue')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_ref_id', itemId);

    if (deleteErr) {
      console.error('[review/suspend] queue delete error', deleteErr);
      return res.status(500).json({ error: 'Failed to update queue' });
    }

    return res.status(200).json({ success: true, queue: { item_type: itemType, item_ref_id: itemId } });
  } catch (err: any) {
    if (err instanceof Error && err.message === 'Item not found') {
      return res.status(404).json({ error: 'Item not found' });
    }
    console.error('[review/suspend] fatal error', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
