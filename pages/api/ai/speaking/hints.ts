import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { env } from '@/lib/env';
import { flags } from '@/lib/flags';
import { touchRateLimit } from '@/lib/rate-limit';
import { getServerClient, supabaseService } from '@/lib/supabaseServer';

const Body = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, 'Enter a word or phrase (at least 2 characters).')
    .max(60, 'Keep the focus word concise.'),
  cue: z.string().trim().max(400, 'Cue context is limited to 400 characters.').optional(),
});

type Success = Readonly<{
  ok: true;
  source: 'ai' | 'heuristic';
  sentences: string[];
  tip?: string;
}>;

type Failure = Readonly<{
  ok: false;
  error: string;
  code?: 'disabled' | 'unauthorized' | 'rate_limited' | 'invalid_body';
}>;

const LIMIT = 15; // generous per-hour limit for micro-hints
const WINDOW_MS = 60 * 60 * 1000;

type AiResult = { sentences: string[]; tip?: string; tokens?: number } | null;

function toGerund(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  if (!words.length) return phrase.trim();
  const [first, ...rest] = words;
  const lower = first.toLowerCase();
  let converted = first;
  if (lower.endsWith('ie')) {
    converted = `${first.slice(0, -2)}ying`;
  } else if (lower.endsWith('e') && first.length > 2) {
    converted = `${first.slice(0, -1)}ing`;
  } else if (!lower.endsWith('ing')) {
    converted = `${first}ing`;
  }
  return [converted, ...rest].join(' ');
}

function buildHeuristic(keyword: string, cue?: string): { sentences: string[]; tip: string } {
  const trimmed = keyword.trim();
  const isVerb = /^to\s+/i.test(trimmed);
  const base = isVerb ? trimmed.replace(/^to\s+/i, '').trim() : trimmed;
  const gerund = isVerb ? toGerund(base) : base;
  const subject = cue?.trim() ? cue.trim() : 'this cue card topic';
  const lead = subject.replace(/[.]+$/g, '');

  const sentences = isVerb
    ? [
        `I start by explaining how ${gerund} with others changed the way I handled ${lead}.`,
        `In the middle of the story I highlight a moment when ${gerund} helped me stay confident during the talk.`,
        `To wrap up, I reflect that ${gerund} is a habit I still rely on whenever I face situations like ${lead}.`,
      ]
    : [
        `I open by saying that ${trimmed} was the driving force behind the story I chose for ${lead}.`,
        `Later I describe a challenge where ${trimmed} helped me keep the narrative of ${lead} on track.`,
        `To conclude, I mention that ${trimmed} still shapes how I approach similar experiences today.`,
      ];

  return {
    sentences,
    tip: 'Use the cue card keyword early, expand with a concrete example, then link it back in your closing sentence.',
  };
}

async function runOpenAI(keyword: string, cue?: string): Promise<AiResult> {
  const key = env.OPENAI_API_KEY;
  if (!key) return null;

  const sys =
    'You are an IELTS Speaking Part 2 coach. Provide three natural sentences that use the learner\'s focus word in the context of a cue card story.' +
    ' Respond strictly as JSON with the shape {"sentences":["..."],"tip":"..."}.' +
    ' Sentences must be fluent, 12–24 words long, and clearly incorporate the focus word.';

  const user = [
    `Focus word or phrase: ${keyword}`,
    cue ? `Cue card context: ${cue}` : null,
    'Return three distinct sentences and one short delivery tip.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) throw new Error(`openai_failed_${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content);
  const sentences = Array.isArray(parsed?.sentences)
    ? parsed.sentences.map((s: any) => String(s ?? '').trim()).filter((s: string) => s.length > 0)
    : [];
  if (!sentences.length) return null;

  const tip = parsed?.tip ? String(parsed.tip).trim() : undefined;
  return { sentences: sentences.slice(0, 3), tip, tokens: payload?.usage?.total_tokens };
}

async function runGemini(keyword: string, cue?: string): Promise<AiResult> {
  const key = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL || 'gemini-1.5-flash' });
  const prompt = [
    'You are an IELTS Speaking Part 2 coach.',
    'Return strictly JSON {"sentences":["..."],"tip":"..."}.',
    'Each sentence must be 12-24 words, fluent, and include the focus word naturally.',
    `Focus word or phrase: ${keyword}`,
    cue ? `Cue context: ${cue}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result?.response?.text()?.trim();
  if (!text) return null;

  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '');
  const parsed = JSON.parse(clean);
  const sentences = Array.isArray(parsed?.sentences)
    ? parsed.sentences.map((s: any) => String(s ?? '').trim()).filter((s: string) => s.length > 0)
    : [];
  if (!sentences.length) return null;

  const tip = parsed?.tip ? String(parsed.tip).trim() : undefined;
  return { sentences: sentences.slice(0, 3), tip };
}

async function logInteraction(params: {
  userId: string;
  keyword: string;
  cue?: string;
  sentences: string[];
  source: 'ai' | 'heuristic';
  tip?: string;
  tokens?: number;
}) {
  try {
    const service = supabaseService();
    await service.from('ai_assist_logs').insert({
      user_id: params.userId,
      feature: 'speaking_hint',
      input: JSON.stringify({ keyword: params.keyword, cue: params.cue }),
      output: { sentences: params.sentences, tip: params.tip, source: params.source },
      tokens_used: params.tokens ?? null,
    });
  } catch (error) {
    console.error('ai_assist_log_failed', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Success | Failure>) {
  if (!flags.enabled('aiAssist')) {
    return res.status(404).json({ ok: false, error: 'Feature disabled', code: 'disabled' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'unauthorized' });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message || 'Invalid body', code: 'invalid_body' });
  }

  const { keyword, cue } = parsed.data;
  const rate = touchRateLimit(`aiassist:speaking:${user.id}`, LIMIT, WINDOW_MS);
  if (rate.limited) {
    const retryAfter = Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ ok: false, error: 'Please try again later.', code: 'rate_limited' });
  }

  let source: 'ai' | 'heuristic' = 'heuristic';
  let sentences: string[] = [];
  let tip: string | undefined;
  let tokens: number | undefined;

  try {
    const aiResult = (await runOpenAI(keyword, cue)) ?? (await runGemini(keyword, cue));
    if (aiResult && aiResult.sentences.length) {
      source = 'ai';
      sentences = aiResult.sentences;
      tip = aiResult.tip;
      tokens = aiResult.tokens;
    }
  } catch (error) {
    console.error('ai_speaking_hints_failed', error);
  }

  if (!sentences.length) {
    const heuristic = buildHeuristic(keyword, cue);
    sentences = heuristic.sentences;
    tip = heuristic.tip;
    source = 'heuristic';
  }

  logInteraction({
    userId: user.id,
    keyword,
    cue,
    sentences,
    tip,
    source,
    tokens,
  }).catch(() => undefined);

  return res.status(200).json({ ok: true, sentences, tip, source });
}
