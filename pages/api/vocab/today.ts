import type { NextApiRequest, NextApiResponse } from 'next';

import { getWordOfDay } from '@/lib/vocabulary/today';
import { getServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';

export type TodayWordResponse = {
  date: string;
  word: {
    id: string;
    headword: string;
    definition: string;
    meaning: string;
    example: string | null;
    exampleTranslation: string | null;
    partOfSpeech: string | null;
    register: string | null;
    cefr: string | null;
    ipa: string | null;
    audioUrl: string | null;
    synonyms: string[];
    topics: string[];
  };
  source: 'rpc' | 'view';
};

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TodayWordResponse | ErrorResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServerClient(req, res);
    const result = await getWordOfDay();
    if (!result) {
      return res.status(404).json({ error: 'Word of the day not scheduled' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await trackor.log('vocab_word_viewed', {
        user_id: user?.id ?? null,
        word_id: result.word.id,
        source: result.source,
        word_date: result.wordDate,
      });
    } catch (error) {
      console.warn('[api/vocab/today] analytics logging failed', error);
    }

    return res.status(200).json({
      date: result.wordDate,
      word: result.word,
      source: result.source,
    });
  } catch (error) {
    console.error('[api/vocab/today] unexpected error', error);
    return res.status(500).json({ error: "Failed to load today's word" });
  }
}
