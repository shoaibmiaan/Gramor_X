import type { NextApiRequest, NextApiResponse } from 'next';

import { getWordOfDay } from '@/lib/vocabulary/today';

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
    const result = await getWordOfDay();
    if (!result) {
      return res.status(404).json({ error: 'Word of the day not scheduled' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

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
