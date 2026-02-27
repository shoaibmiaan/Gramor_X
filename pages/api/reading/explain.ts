import type { NextApiRequest, NextApiResponse } from 'next';

import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { attemptId, qid } = req.body as { attemptId?: string; qid?: string };
    if (!attemptId || !qid) return res.status(400).json({ error: 'Missing attemptId/qid' });

    const { data: attempts, error: attemptErr } = await supabaseAdmin
      .from('reading_responses')
      .select('id, passage_slug, result_json')
      .eq('id', attemptId)
      .limit(1);

    if (attemptErr) {
      return res.status(500).json({ error: attemptErr.message || 'Failed to load attempt' });
    }

    const attempt = attempts?.[0];
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const resultItems = (attempt.result_json as any)?.items ?? [];
    const item = resultItems.find((i: any) => i?.id === qid);
    if (!item) return res.status(404).json({ error: 'Question not found in attempt' });

    const [{ data: passages, error: passageErr }, { data: questionRows, error: questionErr }] = await Promise.all([
      supabaseAdmin
        .from('reading_passages')
        .select('title, content')
        .eq('slug', attempt.passage_slug)
        .limit(1),
      supabaseAdmin
        .from('reading_questions')
        .select('id, options')
        .eq('passage_slug', attempt.passage_slug)
        .eq('id', qid)
        .limit(1),
    ]);

    if (passageErr) {
      return res.status(500).json({ error: passageErr.message || 'Failed to load passage' });
    }
    if (questionErr) {
      return res.status(500).json({ error: questionErr.message || 'Failed to load question' });
    }

    const passage = passages?.[0];
    const questionRow = questionRows?.[0];

    const promptParts = [
      'You are an IELTS Reading tutor.',
      passage?.title ? `Passage title: ${passage.title}` : '',
      passage?.content ? `Passage:\n${stripHtml(String(passage.content))}` : '',
      `Question (Q${item.qNo}, type=${item.type}): ${item.prompt}`,
      item.type === 'mcq' && Array.isArray(questionRow?.options)
        ? `Options: ${(questionRow.options as string[]).join(' | ')}`
        : '',
      `User answer: ${stringify(item.user)}`,
      `Correct answer: ${stringify(item.correct)}`,
      'Explain briefly (2–4 lines) why the correct answer is right. Focus on evidence from the passage.',
    ].filter(Boolean);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing in env' });

    const r = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptParts.join('\n\n') }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 220 },
      }),
    });
    const j = await r.json();
    const text =
      j?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Explanation unavailable right now. Please try again.';

    return res.json({ text });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Explain failed' });
  }
}

function stringify(v: any) {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, ' ');
}
