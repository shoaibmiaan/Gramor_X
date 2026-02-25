import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface SpeakingAttemptBody {
  word_id?: string;
  example_id?: string | null;
  item_type?: 'word' | 'collocation' | 'gap';
  audio_blob_url?: string | null;
  score?: number | null;
  transcript?: string | null;
  target_text?: string | null;
  features?: Record<string, unknown> | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as SpeakingAttemptBody;
  const wordId = body.word_id;
  const exampleId = body.example_id ?? null;
  const itemType = body.item_type ?? 'word';
  const audioBlobUrl = body.audio_blob_url ?? null;
  const score = typeof body.score === 'number' ? body.score : null;
  const transcript = typeof body.transcript === 'string' ? body.transcript : null;
  const targetText = typeof body.target_text === 'string' ? body.target_text : null;
  const features = body.features ?? null;

  if (!wordId || typeof wordId !== 'string') {
    return res.status(400).json({ error: 'Missing word_id' });
  }

  if (!['word', 'collocation', 'gap'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item_type' });
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
    const sanitizedScore = score !== null ? Math.max(0, Math.min(score, 1)) : null;
    const payload = {
      user_id: user.id,
      word_id: wordId,
      example_id: exampleId,
      item_type: itemType,
      audio_blob_url: audioBlobUrl,
      score: sanitizedScore,
      transcript: transcript ?? undefined,
      target_text: targetText ?? undefined,
      features: features ?? {},
    };

    const { data: attemptRow, error: attemptError } = await supabase
      .from('word_pron_attempts')
      .insert(payload)
      .select('id, score, created_at')
      .single();

    if (attemptError || !attemptRow) {
      console.error('[speaking/attempt] insert error', attemptError);
      return res.status(500).json({ error: 'Failed to record attempt' });
    }

    const { data: statsRow, error: statsError } = await supabase
      .from('user_word_stats')
      .select('pron_attempts')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (statsError) {
      console.error('[speaking/attempt] stats fetch error', statsError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    const nextCount = (statsRow?.pron_attempts ?? 0) + 1;

    if (statsRow) {
      const { error: updateError } = await supabase
        .from('user_word_stats')
        .update({ pron_attempts: nextCount })
        .eq('user_id', user.id)
        .eq('word_id', wordId);

      if (updateError) {
        console.error('[speaking/attempt] stats update error', updateError);
        return res.status(500).json({ error: 'Failed to update stats' });
      }
    } else {
      const { error: insertError } = await supabase.from('user_word_stats').insert({
        user_id: user.id,
        word_id: wordId,
        status: 'new',
        pron_attempts: nextCount,
      });

      if (insertError) {
        console.error('[speaking/attempt] stats insert error', insertError);
        return res.status(500).json({ error: 'Failed to initialize stats' });
      }
    }

    return res.status(200).json({
      success: true,
      attempt_id: attemptRow.id,
      score: sanitizedScore,
      pron_attempts: nextCount,
    });
  } catch (error) {
    console.error('[speaking/attempt] fatal error', error);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
