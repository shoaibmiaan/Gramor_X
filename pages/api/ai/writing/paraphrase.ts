import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { env } from '@/lib/env';
import { flags } from '@/lib/flags';
import { touchRateLimit } from '@/lib/rate-limit';
import { getServerClient, supabaseService } from '@/lib/supabaseServer';

const Body = z.object({
  sentence: z
    .string()
    .trim()
    .min(8, 'Provide a full sentence (at least 8 characters).')
    .max(400, 'Keep it under 400 characters.'),
  context: z.string().trim().max(400, 'Context is optional but capped at 400 characters.').optional(),
});

type Suggestion = Readonly<{
  rewrite: string;
  why: string;
  focus: 'lexical' | 'collocation';
}>;

type Success = Readonly<{
  ok: true;
  source: 'ai' | 'heuristic';
  suggestions: Suggestion[];
}>;

type Failure = Readonly<{
  ok: false;
  error: string;
  code?: 'disabled' | 'unauthorized' | 'rate_limited' | 'invalid_body';
}>;

const LIMIT = 12; // per user, per rolling hour
const WINDOW_MS = 60 * 60 * 1000;

const lexicalFixes: ReadonlyArray<{
  pattern: RegExp;
  replacement: string;
  why: string;
}> = [
  {
    pattern: /\bvery important\b/gi,
    replacement: 'absolutely crucial',
    why: 'Swap filler intensifiers for a precise adjective.',
  },
  {
    pattern: /\ba lot of\b/gi,
    replacement: 'a considerable number of',
    why: 'Use an academic quantifier instead of conversational phrasing.',
  },
  {
    pattern: /\breally\b/gi,
    replacement: 'particularly',
    why: 'Replace casual adverbs with precise emphasis.',
  },
  {
    pattern: /\bimportant\b/gi,
    replacement: 'pivotal',
    why: 'Vary common adjectives to boost lexical range.',
  },
  {
    pattern: /\bpeople\b/gi,
    replacement: 'individuals',
    why: 'Use a more formal noun to elevate register.',
  },
];

type CollocationExample = Readonly<{
  example: string;
  why: string;
}>;

const collocationLibrary: ReadonlyArray<{
  key: 'environment' | 'education' | 'technology' | 'health';
  matcher: RegExp;
  examples: CollocationExample[];
}> = [
  {
    key: 'environment',
    matcher: /(environment|climate|pollution|sustainable|emissions|wildlife)/i,
    examples: [
      {
        example: 'Governments must invest in green infrastructure to curb urban pollution.',
        why: '“Invest in green infrastructure” and “curb pollution” are natural collocations.',
      },
      {
        example: 'Local communities can collaborate to combat climate change through tree-planting drives.',
        why: '“Combat climate change” is a precise collocation for environmental issues.',
      },
    ],
  },
  {
    key: 'education',
    matcher: /(education|school|students|teachers|curriculum|classroom|lesson)/i,
    examples: [
      {
        example: 'Schools should integrate project-based learning to nurture critical thinking.',
        why: '“Integrate project-based learning” is an IELTS-friendly collocation.',
      },
      {
        example: 'Teachers can scaffold complex ideas to help students internalise new concepts.',
        why: '“Scaffold complex ideas” is a natural pedagogical collocation.',
      },
    ],
  },
  {
    key: 'technology',
    matcher: /(technology|digital|online|internet|innovation|software|ai\b)/i,
    examples: [
      {
        example: 'Start-ups leverage emerging technology to streamline everyday services.',
        why: '“Leverage emerging technology” and “streamline services” pair well together.',
      },
      {
        example: 'Remote teams rely on robust digital infrastructure to collaborate seamlessly.',
        why: '“Robust digital infrastructure” is a strong collocation for tech contexts.',
      },
    ],
  },
  {
    key: 'health',
    matcher: /(health|hospital|medicine|fitness|well-being|diet|nutrition)/i,
    examples: [
      {
        example: 'Governments must expand preventative healthcare to reduce chronic illnesses.',
        why: '“Expand preventative healthcare” is a precise collocation for policy discussions.',
      },
      {
        example: 'Urban planners can promote active lifestyles by investing in pedestrian-friendly infrastructure.',
        why: '“Promote active lifestyles” is a natural health-focused collocation.',
      },
    ],
  },
];

const defaultLexicalFrame = (sentence: string): Suggestion => ({
  rewrite: `Notably, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`,
  why: 'Opening with a discourse marker boosts cohesion and lexical range.',
  focus: 'lexical',
});

function buildHeuristicSuggestions(sentence: string, context?: string): Suggestion[] {
  const base = sentence.trim();
  const suggestions: Suggestion[] = [];

  for (const fix of lexicalFixes) {
    if (fix.pattern.test(base)) {
      const rewrite = base.replace(fix.pattern, fix.replacement);
      suggestions.push({ rewrite, why: fix.why, focus: 'lexical' });
    }
  }

  const topic = collocationLibrary.find((entry) =>
    entry.matcher.test(context || '') || entry.matcher.test(base),
  );
  if (topic) {
    for (const example of topic.examples) {
      suggestions.push({
        rewrite: example.example,
        why: example.why,
        focus: 'collocation',
      });
    }
  }

  if (!suggestions.length) {
    suggestions.push(defaultLexicalFrame(base));
  }

  // Ensure at least two varied takes
  if (suggestions.length === 1) {
    suggestions.push({
      rewrite: `Instead of repeating common verbs, try: “${base.replace(/\bmake\b/i, 'cultivate').replace(/\bget\b/i, 'obtain')}”.`,
      why: 'Elevating verbs avoids repetition and improves lexical resource.',
      focus: 'lexical',
    });
  }

  return suggestions.slice(0, 3);
}

type AiResult = { suggestions: Suggestion[]; tokens?: number } | null;

async function runOpenAI(sentence: string, context?: string): Promise<AiResult> {
  const key = env.OPENAI_API_KEY;
  if (!key) return null;

  const sys =
    'You are an IELTS Writing tutor. Provide up to 3 paraphrase suggestions that improve lexical variety and collocations.' +
    ' Respond strictly as JSON with shape {"suggestions":[{"rewrite":"...","why":"...","focus":"lexical|collocation"}]}.' +
    ' The rewrite should stay close in meaning to the original sentence.';

  const user = [
    `Sentence: ${sentence}`,
    context ? `Context: ${context}` : null,
    'Explain briefly why each rewrite works (1 sentence).',
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
      temperature: 0.2,
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
  const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  const suggestions: Suggestion[] = rawSuggestions
    .map((item: any) => ({
      rewrite: String(item?.rewrite ?? '').trim(),
      why: String(item?.why ?? '').trim(),
      focus: item?.focus === 'collocation' ? 'collocation' : 'lexical',
    }))
    .filter((item) => item.rewrite.length > 0 && item.why.length > 0)
    .slice(0, 3);

  if (!suggestions.length) return null;
  return { suggestions, tokens: payload?.usage?.total_tokens }; // tokens optional
}

async function runGemini(sentence: string, context?: string): Promise<AiResult> {
  const key = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL || 'gemini-1.5-flash' });
  const prompt = [
    'You are an IELTS Writing tutor. Suggest up to 3 paraphrases that improve lexical variety and collocations.',
    'Return JSON with the shape {"suggestions":[{"rewrite":"...","why":"...","focus":"lexical|collocation"}]} and nothing else.',
    `Sentence: ${sentence}`,
    context ? `Context: ${context}` : null,
    'Focus on natural IELTS phrasing and one-sentence rationales.',
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
  const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  const suggestions: Suggestion[] = rawSuggestions
    .map((item: any) => ({
      rewrite: String(item?.rewrite ?? '').trim(),
      why: String(item?.why ?? '').trim(),
      focus: item?.focus === 'collocation' ? 'collocation' : 'lexical',
    }))
    .filter((item) => item.rewrite.length > 0 && item.why.length > 0)
    .slice(0, 3);

  if (!suggestions.length) return null;
  return { suggestions };
}

async function logInteraction(params: {
  userId: string;
  sentence: string;
  context?: string;
  suggestions: Suggestion[];
  source: 'ai' | 'heuristic';
  tokens?: number;
}) {
  try {
    const service = supabaseService();
    await service.from('ai_assist_logs').insert({
      user_id: params.userId,
      feature: 'paraphrase',
      input: JSON.stringify({ sentence: params.sentence, context: params.context }),
      output: { suggestions: params.suggestions, source: params.source },
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

  const { sentence, context } = parsed.data;
  const rate = touchRateLimit(`aiassist:paraphrase:${user.id}`, LIMIT, WINDOW_MS);
  if (rate.limited) {
    const retryAfter = Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ ok: false, error: 'Please try again later.', code: 'rate_limited' });
  }

  let source: 'ai' | 'heuristic' = 'heuristic';
  let suggestions: Suggestion[] = [];
  let tokens: number | undefined;

  try {
    const aiResult = (await runOpenAI(sentence, context)) ?? (await runGemini(sentence, context));
    if (aiResult && aiResult.suggestions.length) {
      source = 'ai';
      suggestions = aiResult.suggestions;
      tokens = aiResult.tokens;
    }
  } catch (error) {
    console.error('ai_paraphrase_failed', error);
  }

  if (!suggestions.length) {
    suggestions = buildHeuristicSuggestions(sentence, context);
    source = 'heuristic';
  }

  logInteraction({
    userId: user.id,
    sentence,
    context,
    suggestions,
    source,
    tokens,
  }).catch(() => undefined);

  return res.status(200).json({ ok: true, suggestions, source });
}
