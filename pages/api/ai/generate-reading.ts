// pages/api/ai/generate-reading.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.GX_AI_MODEL || 'gpt-4o-mini';

type In = { theme?: string; difficulty?: 'Easy'|'Medium'|'Hard'; length?: 'short'|'medium'; types?: Array<'tfng'|'mcq'|'matching'|'short'> };
type Out = {
  passage: string;
  questions: Array<{
    type: 'tfng'|'mcq'|'matching'|'short';
    prompt: string;
    options?: string[];
    answer?: string; // keep for staff; strip for users
    explanation?: string;
  }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Out | { error: string }>) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = (req.body || {}) as In;
    const theme = body.theme || 'Contemporary science';
    const difficulty = body.difficulty || 'Medium';
    const types = (body.types && body.types.length) ? body.types.slice(0, 3) : ['mcq','tfng'];

    if (!API_KEY) {
      return res.status(200).json({
        passage: 'Sample passage (developer mode): Cities foster biodiversity in unexpected niches...',
        questions: [
          { type: 'mcq', prompt: 'Main idea?', options: ['A','B','C','D'], answer: 'B', explanation: '...' },
          { type: 'tfng', prompt: 'Urban parks always increase species richness.', answer: 'False', explanation: '...' },
        ],
      });
    }

    const sys = [
      'Generate an IELTS-style reading passage and 6 questions.',
      `Difficulty: ${difficulty}. Types allowed: ${types.join(', ')}.`,
      'Keep one paragraph per 120–150 words; total ~350–450 words.',
      'Return strict JSON with keys: passage (string), questions (array).',
      'For each question include: type, prompt, options (if MCQ), answer, explanation.',
      'Avoid copyrighted or real exam content.'
    ].join(' ');

    const user = `Theme: ${theme}`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    if (!r.ok) return res.status(500).json({ error: `Provider error (${r.status})` });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
