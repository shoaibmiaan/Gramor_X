import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

const INFORMAL_MARKERS = ['gonna', 'wanna', 'kinda', 'sorta', 'dude', 'buddy', 'kiddo', 'stuff', 'cool'];

interface WritingEvalBody {
  word_id?: string;
  item_type?: 'word' | 'collocation' | 'gap';
  text?: string;
  prompt?: string;
  register?: 'formal' | 'neutral' | null;
  scenarios?: string[];
  suggested_collocations?: string[];
}

function countSentences(text: string) {
  const matches = text
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[.!?]+/g);
  if (!matches) return text.trim().length > 0 ? 1 : 0;
  return matches.length;
}

function countTokens(text: string) {
  const tokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length;
}

function normalise(value: string) {
  return value
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

  const body = (req.body ?? {}) as WritingEvalBody;
  const wordId = typeof body.word_id === 'string' ? body.word_id : null;
  const text = typeof body.text === 'string' ? body.text : '';
  const itemType = body.item_type && ['word', 'collocation', 'gap'].includes(body.item_type)
    ? body.item_type
    : 'word';

  if (!wordId) {
    return res.status(400).json({ error: 'Missing word_id' });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Provide a sentence or two to evaluate.' });
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
    const [{ data: wordRow, error: wordError }, { data: collocationsRows, error: collocationError }] = await Promise.all([
      supabase
        .from('words')
        .select('id, headword, register, definition, ielts_topics')
        .eq('id', wordId)
        .maybeSingle(),
      supabase
        .from('word_collocations')
        .select('chunk')
        .eq('word_id', wordId)
        .limit(6),
    ]);

    if (wordError || !wordRow) {
      console.error('[writing/eval] failed to load word', wordError);
      return res.status(404).json({ error: 'Word not found' });
    }

    if (collocationError) {
      console.error('[writing/eval] failed to load collocations', collocationError);
      return res.status(500).json({ error: 'Failed to evaluate collocations' });
    }

    const headword = wordRow.headword ?? '';
    const register = (body.register ?? wordRow.register ?? null) as 'formal' | 'neutral' | null;
    const allowedCollocations = Array.isArray(collocationsRows)
      ? collocationsRows.map((row) => row.chunk).filter((chunk): chunk is string => typeof chunk === 'string')
      : [];

    const providedCollocations = Array.isArray(body.suggested_collocations)
      ? body.suggested_collocations.filter((entry): entry is string => typeof entry === 'string')
      : [];

    const collocations = Array.from(new Set([...allowedCollocations, ...providedCollocations])).slice(0, 6);

    const headwordUsed = normalise(text).includes(normalise(headword));
    const collocationsUsed = collocations.filter((chunk) => normalise(text).includes(normalise(chunk)));
    const sentenceCount = countSentences(text);
    const tokens = countTokens(text);
    const informalDetected = register === 'formal'
      ? INFORMAL_MARKERS.some((marker) => normalise(text).includes(marker))
      : false;

    const checks = {
      headwordUsed,
      collocationUsed: collocationsUsed.length > 0,
      sentenceCountOk: sentenceCount >= 1 && sentenceCount <= 2,
      registerOk: !informalDetected,
    };

    let score = 100;
    const feedback: string[] = [];

    if (!checks.headwordUsed) {
      score -= 40;
      feedback.push(`Include the target word “${headword}” at least once.`);
    }

    if (!checks.collocationUsed && collocations.length > 0) {
      score -= 20;
      feedback.push('Work in one of the recommended collocations to show range.');
    }

    if (!checks.sentenceCountOk) {
      score -= 20;
      feedback.push('Keep the response to one or two sentences.');
    }

    if (!checks.registerOk) {
      score -= 20;
      feedback.push('Avoid informal filler when practising a formal register.');
    }

    if (tokens < 8) {
      score -= 10;
      feedback.push('Aim for richer detail—add a clause or supporting idea.');
    }

    score = Math.max(0, Math.min(100, score));

    if (feedback.length === 0) {
      feedback.push('Great job! The sentence(s) look exam-ready.');
    }

    const { data: attemptRow, error: attemptError } = await supabase
      .from('word_writing_attempts')
      .insert({
        user_id: user.id,
        word_id: wordId,
        item_type: itemType,
        prompt: body.prompt ?? `Write two sentences using “${headword}”.`,
        response: text,
        tokens,
        sentences: sentenceCount,
        collocations_used: collocationsUsed,
        register_target: register,
        checks,
        feedback: feedback.join(' '),
        score,
      })
      .select('id')
      .maybeSingle();

    if (attemptError || !attemptRow) {
      console.error('[writing/eval] failed to insert attempt', attemptError);
      return res.status(500).json({ error: 'Failed to record attempt' });
    }

    const { data: statsRow, error: statsError } = await supabase
      .from('user_word_stats')
      .select('writing_attempts')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (statsError) {
      console.error('[writing/eval] failed to fetch stats', statsError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    const nextCount = (statsRow?.writing_attempts ?? 0) + 1;

    if (statsRow) {
      const { error: updateError } = await supabase
        .from('user_word_stats')
        .update({ writing_attempts: nextCount })
        .eq('user_id', user.id)
        .eq('word_id', wordId);

      if (updateError) {
        console.error('[writing/eval] failed to increment attempts', updateError);
        return res.status(500).json({ error: 'Failed to increment attempts' });
      }
    } else {
      const { error: insertStatsError } = await supabase.from('user_word_stats').insert({
        user_id: user.id,
        word_id: wordId,
        status: 'new',
        writing_attempts: nextCount,
      });

      if (insertStatsError) {
        console.error('[writing/eval] failed to create stats', insertStatsError);
        return res.status(500).json({ error: 'Failed to initialise stats' });
      }
    }

    return res.status(200).json({
      success: true,
      score,
      feedback: feedback.join(' '),
      checks,
      collocations_used: collocationsUsed,
      writing_attempts: nextCount,
    });
  } catch (error) {
    console.error('[writing/eval] fatal error', error);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
