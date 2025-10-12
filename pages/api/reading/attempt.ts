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
  const itemType =
    body.item_type && ['word', 'collocation', 'gap'].includes(body.item_type)
      ? body.item_type
      : 'word';
  const passage = typeof body.passage === 'string' ? body.passage : '';
  const blanks = Array.isArray(body.blanks) ? body.blanks : [];
  const responses = Array.isArray(body.responses) ? body.responses : [];

  if (!wordId) {
    return res.status(400).json({ error: 'Missing word_id' });
  }

  if (blanks.length === 0) {
    return res.status(400).json({ error: 'No blanks provided' });
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
    // Build answer map from provided blanks
    const blankMap = new Map<string, { label: string; answer: string }>();
    blanks.forEach((blank, index) => {
      const id = typeof blank.id === 'string' ? blank.id : `blank-${index + 1}`;
      const answer = typeof blank.answer === 'string' ? blank.answer : '';
      blankMap.set(id, {
        label: typeof blank.label === 'string' ? blank.label : `Blank ${index + 1}`,
        answer,
      });
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

    const feedback =
      score === 100
        ? 'Perfect! All blanks were filled accurately.'
        : score >= 67
        ? 'Solid effort—review the incorrect blanks and try once more.'
        : 'Re-read the paragraph carefully and notice the collocations around each blank.';

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
      if (process.env.NODE_ENV !== 'production') {
        console.error('[reading/attempt] failed to insert attempt', attemptError);
      }
      return res.status(500).json({ error: 'Failed to record attempt' });
    }

    const { data: statsRow, error: statsError } = await supabase
      .from('user_word_stats')
      .select('reading_attempts')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (statsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[reading/attempt] failed to fetch stats', statsError);
      }
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
        if (process.env.NODE_ENV !== 'production') {
          console.error('[reading/attempt] failed to increment attempts', updateError);
        }
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
        if (process.env.NODE_ENV !== 'production') {
          console.error('[reading/attempt] failed to initialise stats', insertError);
        }
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('[reading/attempt] fatal error', error);
    }
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
