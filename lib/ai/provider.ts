// lib/ai/provider.ts
import type { NextApiRequest } from 'next';

export type Kind = 'tfng' | 'mcq' | 'matching' | 'short';

export type RecommendInput = {
  userId: string;
  kpis: {
    bandEstimate?: number;
    accuracy10?: number;       // 0..1
    avgSecPerQ?: number;       // seconds
    streakDays?: number;
    totalPractices?: number;
  };
  byType: { type: Kind; accuracy: number; attempts: number }[]; // accuracy 0..1
  recent: { slug: string; title: string; score: number; minutes: number; types: Kind[] }[];
};

export type RecommendOutput = {
  forecast?: { // simple, readable forecast to display
    targetBand: number;
    etaDays: number;       // in days from today
    confidence: 'low' | 'med' | 'high';
    rationale: string;     // 1-2 sentences
  };
  actions: Array<{
    label: string;         // e.g., "TFNG — Not Given traps"
    reason: string;        // short why
    href: string;          // deep link to prefiltered practice
    secondary?: string;    // review link
  }>;
  tips?: string[];         // 1-3 tiny tips to show inline
};

const MODEL = process.env.GX_AI_MODEL || 'gpt-4o-mini';
const API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Calls OpenAI with strict JSON output. If no key is configured,
 * returns a deterministic fallback to avoid UX dead-ends.
 */
export async function getAIRecommendations(input: RecommendInput): Promise<RecommendOutput> {
  if (!API_KEY) {
    // Fallback – deterministic suggestions based on weakest type
    const weakest = [...input.byType].sort((a, b) => (a.accuracy - b.accuracy))[0];
    const weakLabel: Record<Kind, string> = {
      tfng: 'TFNG — Not Given traps',
      mcq: 'MCQ — synonym distractors',
      matching: 'Matching — headings',
      short: 'Short answer — keyword location',
    };
    const href = weakest ? `/reading?type=${weakest.type}` : '/reading';
    return {
      forecast: {
        targetBand: Math.round(((input.kpis.bandEstimate ?? 6.0) + 0.5) * 10) / 10,
        etaDays: 21,
        confidence: 'med',
        rationale: 'Based on recent accuracy and volume, a half-band lift is realistic within ~3 weeks.',
      },
      actions: [{
        label: weakest ? weakLabel[weakest.type] : 'Quick mixed drill',
        reason: weakest ? `Accuracy ${Math.round(weakest.accuracy * 100)}% — focus next`
                        : 'Build momentum with a short mixed drill',
        href,
      }],
      tips: [
        'Scan for paraphrases before picking keywords.',
        'Cap time per question to reduce overthinking.',
        'Mark “doubtfuls”, return after first pass.',
      ],
    };
  }

  const SYS = [
    'You are an IELTS Reading coach.',
    'Return strict JSON matching the schema RecommendOutput.',
    'Be concise. Max 3 actions. Each action must have a concrete href path.',
    'Use current weaknesses (low accuracy / high sec per Q) to choose actions.',
    'Forecast should be realistic for 2–6 weeks horizon.'
  ].join(' ');

  const user = JSON.stringify(input);

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!r.ok) {
    // Safe fallback on provider errors
    return {
      actions: [{ label: 'Quick mixed drill', reason: 'Provider error fallback', href: '/reading' }],
      tips: ['Try a short set; keep momentum.'],
    };
  }

  const json = await r.json() as any;
  const text = json?.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(text) as RecommendOutput;
  } catch {
    return {
      actions: [{ label: 'Quick mixed drill', reason: 'Parse fallback', href: '/reading' }],
    };
  }
}

/** Simple guard to avoid abuse from unauthenticated calls (optional). */
export function requireAuthUserId(req: NextApiRequest, userId?: string) {
  if (!userId) {
    // You can throw or return a 401 in route handler. Keeping helper here for clarity.
    throw new Error('Unauthorized');
  }
}
