import type { NextApiRequest, NextApiResponse } from 'next';

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
  const passage = typeof body.passage === 'string' ? body.passage : '';
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
    const { data: wordRow, error: wordError } = await supabase
      .from('words')
      .select('id, headword')
      .eq('id', wordId)
      .maybeSingle();

    if (wordError) {
      console.error('[reading/attempt] failed to fetch word', wordError);
      return res.status(500).json({ error: 'Failed to load word data' });
    }

    if (!wordRow) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const { data: collocations, error: collocationError } = await supabase
      .from('word_collocations')
      .select('chunk')
      .eq('word_id', wordId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (collocationError) {
      console.error('[reading/attempt] failed to fetch collocations', collocationError);
      return res.status(500).json({ error: 'Failed to load collocation data' });
    }

    const collocationChunks = (collocations ?? [])
      .map((row) => (typeof row?.chunk === 'string' ? row.chunk : null))
      .filter((chunk): chunk is string => !!chunk);

    const suggestedCollocations: string[] = collocationChunks.slice(0, 3);
    const fallbackHeadword = typeof wordRow.headword === 'string' && wordRow.headword.trim()
      ? wordRow.headword.trim()
      : 'this word';
    while (suggestedCollocations.length < 3) {
      suggestedCollocations.push(`use ${fallbackHeadword}`);
    }

    const blankDefinitions = [
      { id: 'blank-headword', label: 'Headword', answer: wordRow.headword ?? '' },
      { id: 'blank-collocation-1', label: 'Collocation 1', answer: suggestedCollocations[0] },
      {
        id: 'blank-collocation-2',
        label: 'Collocation 2',
        answer: suggestedCollocations[1] ?? suggestedCollocations[0],
      },
    ];

    const blankMap = new Map<string, { label: string; answer: string }>();
    blankDefinitions.forEach((blank) => {
      blankMap.set(blank.id, { label: blank.label, answer: blank.answer });
    });

    const resultRows = Array.from(blankMap.entries()).map(([id, meta]) => {
      const responseEntry = responses.find((entry) => entry && entry.id === id);
      const responseText = typeof responseEntry?.response === 'string' ? responseEntry.response : '';
      const correct = normalise(responseText) === normalise(meta.answer);
      return {
        id,
        label: meta.label,
        expected: meta.answer,
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
        passage,
        blanks: resultRows.map((row) => ({ id: row.id, label: row.label, answer: row.expected })),
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
