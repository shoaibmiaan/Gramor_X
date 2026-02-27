import type { NextApiRequest, NextApiResponse } from 'next';

import { buildReadingMiniCloze } from '@/lib/skills/readingMiniCloze';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface ReadingAttemptBody {
  word_id?: string;
  item_type?: 'word' | 'collocation' | 'gap';
  passage?: string;
  blanks?: Array<{ id: string; label?: string; answer?: string }>;
  responses?: Array<{ id: string; response?: string }>;
}

function normalise(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as ReadingAttemptBody;
  const wordId = typeof body.word_id === 'string' ? body.word_id : null;
  const itemType = body.item_type && ['word', 'collocation', 'gap'].includes(body.item_type)
    ? body.item_type
    : 'word';
  const responses = Array.isArray(body.responses) ? body.responses : [];

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
    const [wordRes, collocationsRes, examplesRes] = await Promise.all([
      supabase
        .from('words')
        .select('id, headword, definition, register, ielts_topics')
        .eq('id', wordId)
        .maybeSingle(),
      supabase
        .from('word_collocations')
        .select('id, word_id, chunk, pattern, note')
        .eq('word_id', wordId),
      supabase
        .from('word_examples')
        .select('id, word_id, text, source, is_gap_ready, ielts_topic')
        .eq('word_id', wordId)
        .order('updated_at', { ascending: false })
        .limit(5),
    ]);

    if (wordRes.error || !wordRes.data) {
      console.error('[reading/attempt] failed to load word', wordRes.error);
      return res.status(400).json({ error: 'Reading drill unavailable for this word' });
    }

    if (collocationsRes.error || examplesRes.error) {
      console.error('[reading/attempt] failed to load context', {
        collocations: collocationsRes.error,
        examples: examplesRes.error,
      });
      return res.status(500).json({ error: 'Failed to prepare reading drill' });
    }

    const readingMiniCloze = buildReadingMiniCloze({
      word: wordRes.data,
      collocations: collocationsRes.data ?? [],
      examples: examplesRes.data ?? [],
    });

    if (!readingMiniCloze || readingMiniCloze.blanks.length === 0) {
      return res.status(400).json({ error: 'Reading drill unavailable for this word' });
    }

    const responseMap = new Map<string, string>();
    responses.forEach((entry) => {
      if (entry && typeof entry.id === 'string' && typeof entry.response === 'string') {
        responseMap.set(entry.id, entry.response);
      }
    });

    const resultRows = readingMiniCloze.blanks.map((blank) => {
      const responseText = responseMap.get(blank.id) ?? '';
      const correct = normalise(responseText) === normalise(blank.answer);
      return {
        id: blank.id,
        label: blank.label,
        expected: blank.answer,
        response: responseText,
        correct,
      };
    });

    const correctCount = resultRows.filter((row) => row.correct).length;
    const score = resultRows.length > 0 ? Math.round((correctCount / resultRows.length) * 100) : 0;
    let feedback: string;
    if (score === 100) {
      feedback = 'Perfect! All blanks were filled accurately.';
    } else if (score >= 67) {
      feedback = 'Solid effort—review the incorrect blanks and try once more.';
    } else {
      feedback = 'Re-read the paragraph carefully and notice the collocations around each blank.';
    }

    const { data: attemptRow, error: attemptError } = await supabase
      .from('word_reading_attempts')
      .insert({
        user_id: user.id,
        word_id: wordId,
        item_type: itemType,
        passage: readingMiniCloze.passage,
        blanks: readingMiniCloze.blanks,
        responses: resultRows.map((row) => ({ id: row.id, response: row.response, correct: row.correct })),
        score,
        feedback,
      })
      .select('id')
      .maybeSingle();

    if (attemptError || !attemptRow) {
      console.error('[reading/attempt] failed to insert attempt', attemptError);
      return res.status(500).json({ error: 'Failed to record attempt' });
    }

    const { data: statsRow, error: statsError } = await supabase
      .from('user_word_stats')
      .select('reading_attempts')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (statsError) {
      console.error('[reading/attempt] failed to fetch stats', statsError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    const nextCount = (statsRow?.reading_attempts ?? 0) + 1;

    if (statsRow) {
      const { error: updateError } = await supabase
        .from('user_word_stats')
        .update({ reading_attempts: nextCount })
        .eq('user_id', user.id)
        .eq('word_id', wordId);

      if (updateError) {
        console.error('[reading/attempt] failed to increment attempts', updateError);
        return res.status(500).json({ error: 'Failed to increment attempts' });
      }
    } else {
      const { error: insertError } = await supabase.from('user_word_stats').insert({
        user_id: user.id,
        word_id: wordId,
        status: 'new',
        reading_attempts: nextCount,
      });

      if (insertError) {
        console.error('[reading/attempt] failed to initialise stats', insertError);
        return res.status(500).json({ error: 'Failed to initialise stats' });
      }
    }

    return res.status(200).json({
      success: true,
      score,
      feedback,
      results: resultRows,
      reading_attempts: nextCount,
    });
  } catch (error) {
    console.error('[reading/attempt] fatal error', error);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
