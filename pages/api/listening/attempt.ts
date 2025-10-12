import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface ListeningAttemptBody {
  word_id?: string;
  item_type?: 'word' | 'collocation' | 'gap';
  audio_url?: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as ListeningAttemptBody;
  const wordId = typeof body.word_id === 'string' ? body.word_id : null;
  const itemType = body.item_type && ['word', 'collocation', 'gap'].includes(body.item_type)
    ? body.item_type
    : 'word';
  const audioUrl = typeof body.audio_url === 'string' ? body.audio_url : null;

  if (!wordId) {
    return res.status(400).json({ error: 'Missing word_id' });
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
    const { data: attemptRow, error: attemptError } = await supabase
      .from('word_listening_attempts')
      .insert({
        user_id: user.id,
        word_id: wordId,
        item_type: itemType,
        audio_url: audioUrl,
      })
      .select('id')
      .maybeSingle();

    if (attemptError || !attemptRow) {
      console.error('[listening/attempt] failed to insert attempt', attemptError);
      return res.status(500).json({ error: 'Failed to record attempt' });
    }

    const { data: statsRow, error: statsError } = await supabase
      .from('user_word_stats')
      .select('listening_attempts')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (statsError) {
      console.error('[listening/attempt] failed to fetch stats', statsError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    const nextCount = (statsRow?.listening_attempts ?? 0) + 1;

    if (statsRow) {
      const { error: updateError } = await supabase
        .from('user_word_stats')
        .update({ listening_attempts: nextCount })
        .eq('user_id', user.id)
        .eq('word_id', wordId);

      if (updateError) {
        console.error('[listening/attempt] failed to increment attempts', updateError);
        return res.status(500).json({ error: 'Failed to increment attempts' });
      }
    } else {
      const { error: insertError } = await supabase.from('user_word_stats').insert({
        user_id: user.id,
        word_id: wordId,
        status: 'new',
        listening_attempts: nextCount,
      });

      if (insertError) {
        console.error('[listening/attempt] failed to initialise stats', insertError);
        return res.status(500).json({ error: 'Failed to initialise stats' });
      }
    }

    return res.status(200).json({ success: true, listening_attempts: nextCount });
  } catch (error) {
    console.error('[listening/attempt] fatal error', error);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
