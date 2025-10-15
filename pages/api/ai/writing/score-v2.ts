import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { trackor } from '@/lib/analytics/trackor.server';
import { withPlan } from '@/lib/apiGuard';
import { env } from '@/lib/env';
import { redis } from '@/lib/redis';
import { supabaseServer } from '@/lib/supabaseServer';

const BodySchema = z.object({
  attemptId: z.string().uuid().optional(),
  taskType: z.enum(['task1', 'task2']),
  promptId: z.string().uuid().optional(),
  text: z.string().trim().min(80).max(8000),
  words: z.number().int().min(50).max(2000).optional(),
  targetBand: z.number().min(4).max(9).optional(),
  locale: z.enum(['en']).default('en'),
});

const ModelBreakdownSchema = z
  .object({
    taskResponse: z.number(),
    coherence: z.number(),
    lexicalResource: z.number().optional(),
    lexical_resource: z.number().optional(),
    lexical: z.number().optional(),
    lexicalRange: z.number().optional(),
    lexical_range: z.number().optional(),
    grammar: z.number().optional(),
    grammaticalRange: z.number().optional(),
    grammatical_range: z.number().optional(),
    cohesion: z.number().optional(),
    coherenceCohesion: z.number().optional(),
  })
  .passthrough();

const ModelFeedbackSchema = z
  .object({
    summary: z.string(),
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
  })
  .partial({ strengths: true, improvements: true })
  .passthrough();

const ModelScoreSchema = z
  .object({
    overallBand: z.number(),
    breakdown: ModelBreakdownSchema,
    feedback: ModelFeedbackSchema.optional(),
  })
  .passthrough();

type WritingScore = {
  overall: number;
  breakdown: { taskResponse: number; coherence: number; lexical: number; grammar: number };
  suggestions: string[];
  wordCount: number;
  feedback?: {
    summary: string;
    strengths?: string[];
    improvements?: string[];
  };
  provider?: string;
};

type WritingResponse =
  | { ok: true; attemptId?: string; score: WritingScore }
  | {
      ok: false;
      error: string;
      code?: 'UNAUTHORIZED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'DB_ERROR' | 'RATE_LIMITED';
    };

type ModelScorePayload = z.infer<typeof ModelScoreSchema>;

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const openaiModel = (env.OPENAI_MODEL || 'gpt-4o-mini').trim();

const DEFAULT_SUGGESTIONS = [
  'Strengthen the overview and ensure each body paragraph clearly answers the task.',
  'Use clearer linking phrases to improve cohesion between ideas.',
  'Broaden your vocabulary choices and double-check complex grammar.',
];

function clampHalf(n: number, min = 0, max = 9) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n * 2) / 2));
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function sanitizeStrings(input?: string[] | null) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s) => s.length > 0)
    ),
  );
}

function pickNumber(obj: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const num = Number(val);
      if (Number.isFinite(num)) return num;
    }
  }
  return fallback;
}

type PromptLookupSource = Record<string, unknown> | null | undefined;

function collectPromptCandidates(source: PromptLookupSource, taskType: 'task1' | 'task2') {
  if (!source || typeof source !== 'object') return [] as { text: string; path: string }[];
  const matches: { text: string; path: string }[] = [];
  const stack: { value: unknown; path: string }[] = [{ value: source, path: '' }];

  while (stack.length) {
    const { value, path } = stack.pop()!;
    if (value == null) continue;
    if (typeof value === 'string') continue;
    if (Array.isArray(value)) {
      value.forEach((entry, idx) => stack.push({ value: entry, path: `${path}[${idx}]` }));
      continue;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    for (const [key, val] of entries) {
      const keyLower = key.toLowerCase();
      const nextPath = path ? `${path}.${keyLower}` : keyLower;
      if (typeof val === 'string') {
        if (keyLower.includes('prompt') || keyLower.includes('question')) {
          const text = val.trim();
          if (text.length >= 12) matches.push({ text, path: nextPath });
        }
      } else if (val && typeof val === 'object') {
        stack.push({ value: val, path: nextPath });
      }
    }
  }

  if (!matches.length) return matches;
  const typeMatches = matches.filter((m) => m.path.includes(taskType));
  return (typeMatches.length ? typeMatches : matches).sort((a, b) => b.text.length - a.text.length);
}

function extractPromptText(row: PromptLookupSource, taskType: 'task1' | 'task2') {
  const candidates = collectPromptCandidates(row, taskType);
  if (candidates.length) return candidates[0].text;
  return null;
}

async function fetchPromptText(
  supabase: ReturnType<typeof supabaseServer>,
  promptId: string,
  taskType: 'task1' | 'task2',
) {
  const tables: { name: string; columns: string }[] = [
    { name: 'writing_prompts', columns: 'prompt, task1_prompt, task2_prompt, task1_question, task2_question, metadata_json' },
    { name: 'content_items', columns: 'metadata_json' },
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table.name).select(table.columns).eq('id', promptId).maybeSingle();
      if (error || !data) continue;
      const direct = extractPromptText(data, taskType);
      if (direct) return direct;
      if ('metadata_json' in data) {
        const meta = (data as Record<string, unknown>).metadata_json;
        const metaPrompt = extractPromptText(meta as PromptLookupSource, taskType);
        if (metaPrompt) return metaPrompt;
      }
    } catch {
      // Table might not exist in this environment; ignore and continue.
    }
  }

  return null;
}

async function resolvePrompt(
  supabase: ReturnType<typeof supabaseServer>,
  attemptPromptId: string | null | undefined,
  requestPromptId: string | undefined,
  taskType: 'task1' | 'task2',
) {
  const ids = Array.from(new Set([requestPromptId, attemptPromptId].filter(Boolean))) as string[];
  for (const id of ids) {
    const text = await fetchPromptText(supabase, id, taskType);
    if (text) return { promptId: id, promptText: text };
  }
  return { promptId: ids[0] ?? null, promptText: null };
}

function parseModelJson(raw: string) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normaliseModelScore(payload: ModelScorePayload, wordCount: number): WritingScore {
  const breakdown = payload.breakdown ?? ({} as Record<string, unknown>);
  const summary = payload.feedback?.summary?.trim();
  const improvements = sanitizeStrings(payload.feedback?.improvements);
  const strengths = sanitizeStrings(payload.feedback?.strengths);

  const taskResponse = clampHalf(pickNumber(breakdown, ['taskResponse'], payload.overallBand));
  const cohesion = clampHalf(
    pickNumber(breakdown, ['coherence', 'cohesion', 'coherenceCohesion'], payload.overallBand),
  );
  const lexical = clampHalf(
    pickNumber(
      breakdown,
      ['lexicalResource', 'lexical_resource', 'lexical', 'lexicalRange', 'lexical_range'],
      payload.overallBand,
    ),
  );
  const grammar = clampHalf(
    pickNumber(breakdown, ['grammar', 'grammaticalRange', 'grammatical_range'], payload.overallBand),
  );

  const suggestions = improvements.length
    ? improvements
    : summary
      ? [summary]
      : DEFAULT_SUGGESTIONS;

  return {
    overall: clampHalf(payload.overallBand),
    breakdown: {
      taskResponse,
      coherence: cohesion,
      lexical,
      grammar,
    },
    suggestions,
    wordCount,
    feedback: summary
      ? {
          summary,
          strengths: strengths.length ? strengths : undefined,
          improvements: improvements.length ? improvements : undefined,
        }
      : undefined,
  };
}

function heuristic(text: string, wordsHint?: number): WritingScore {
  const wordCount = wordsHint ?? countWords(text);
  const longSentences = (text.match(/[,;:—-]/g) ?? []).length;
  const paragraphs = text.split(/\n{2,}/).length;
  const base = 6 + (paragraphs >= 3 ? 0.5 : 0) + (longSentences > 8 ? 0.5 : 0) + (wordCount > 260 ? 0.5 : 0);
  const overall = clampHalf(base, 4.5, 8.5);
  const improvements = [
    'Strengthen the overview and maintain a clear position from the introduction.',
    'Use topic sentences and cohesive devices to guide the reader.',
    'Vary complex sentences while checking agreement and punctuation carefully.',
  ];
  const strengths = [
    'Essay meets basic IELTS length expectations.',
    'Multiple paragraphs indicate an attempt at clear structure.',
  ];
  return {
    overall,
    breakdown: {
      taskResponse: clampHalf(base - 0.5, 4.5, 8.5),
      coherence: clampHalf(base, 4.5, 8.5),
      lexical: clampHalf(base - 0.5, 4.5, 8.5),
      grammar: clampHalf(base - 0.5, 4.5, 8.5),
    },
    suggestions: improvements,
    wordCount,
    feedback: {
      summary: 'Heuristic estimate. Provide more precise evaluation using the AI scorer when available.',
      strengths,
      improvements,
    },
    provider: 'heuristic',
  };
}

async function scoreWithModel(opts: {
  text: string;
  promptText: string | null;
  taskType: 'task1' | 'task2';
  targetBand?: number;
  wordCount: number;
  locale?: string;
}): Promise<{ score: WritingScore; provider: string; raw: unknown }>
{
  if (!openaiClient) {
    return { score: heuristic(opts.text, opts.wordCount), provider: 'heuristic', raw: { reason: 'openai_disabled' } };
  }

  const taskLabel = opts.taskType === 'task1' ? 'Task 1' : 'Task 2';
  const promptLines = [
    `You are an IELTS Writing examiner. Evaluate the candidate's ${taskLabel} response using official band descriptors.`,
    'Return a JSON object that matches this TypeScript type:',
    '{',
    '  "overallBand": number,',
    '  "breakdown": {',
    '    "taskResponse": number,',
    '    "coherence": number,',
    '    "lexicalResource": number,',
    '    "grammar": number',
    '  },',
    '  "feedback": {',
    '    "summary": string,',
    '    "strengths": string[],',
    '    "improvements": string[]',
    '  }',
    '}',
    'Use 0.5 increments (e.g. 6.5). Keep the summary to two sentences.',
  ];

  if (opts.targetBand) {
    promptLines.push(`The student is aiming for approximately band ${opts.targetBand}. Use this for coaching tone only.`);
  }

  const questionText = opts.promptText
    ? `Task question:\n${opts.promptText.trim()}`
    : 'Task question: Not available. Infer reasonable expectations from the answer.';

  promptLines.push(questionText);
  promptLines.push(`Candidate answer (${opts.wordCount} words):\n${opts.text.trim()}`);

  try {
    const completion = await openaiClient.chat.completions.create({
      model: openaiModel,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an IELTS Writing examiner providing band scores and feedback.' },
        { role: 'user', content: promptLines.join('\n\n') },
      ],
    });

    const rawText = completion.choices?.[0]?.message?.content ?? '{}';
    const parsed = parseModelJson(rawText);
    if (!parsed) throw new Error('Model response was not valid JSON');
    const validated = ModelScoreSchema.safeParse(parsed);
    if (!validated.success) throw new Error(`Invalid model response: ${validated.error.message}`);

    const score = normaliseModelScore(validated.data, opts.wordCount);
    return { score: { ...score, provider: openaiModel }, provider: openaiModel, raw: validated.data };
  } catch (error) {
    console.error('writing.score-v2 AI failure', error);
    return {
      score: heuristic(opts.text, opts.wordCount),
      provider: 'heuristic',
      raw: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse<WritingResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const supabase = supabaseServer(req);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  }

  const { attemptId, taskType, promptId, text, words, targetBand } = parsed.data;

  const limitEnv = process.env.LIMIT_FREE_WRITING ?? process.env.LIMIT_FREE_WRITING_AI;
  const limit = limitEnv ? Number(limitEnv) : 0;
  if (Number.isFinite(limit) && limit > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `writing:auto:${auth.user.id}:${today}`;
    const currentRaw = await redis.get(key);
    const current = currentRaw ? Number(currentRaw) : 0;
    if (current >= limit) {
      return res.status(429).json({ ok: false, error: 'Daily auto-scoring limit reached', code: 'RATE_LIMITED' });
    }
    const next = await redis.incr(key);
    if (next === 1) await redis.expire(key, 24 * 60 * 60);
  }

  let attemptPromptId: string | null | undefined;
  if (attemptId) {
    const { data, error } = await supabase
      .from('attempts_writing')
      .select('user_id, prompt_id')
      .eq('id', attemptId)
      .maybeSingle();
    if (error || !data || data.user_id !== auth.user.id) {
      return res.status(404).json({ ok: false, error: 'Attempt not found', code: 'NOT_FOUND' });
    }
    attemptPromptId = data.prompt_id;
  }

  const wordCount = words ?? countWords(text);
  const { promptId: resolvedPromptId, promptText } = await resolvePrompt(
    supabase,
    attemptPromptId,
    promptId,
    taskType,
  );

  const aiResult = await scoreWithModel({
    text,
    promptText,
    taskType,
    targetBand,
    wordCount,
    locale: parsed.data.locale,
  });

  const score = aiResult.score;

  if (attemptId) {
    try {
      await supabase
        .from('attempts_writing')
        .update({
          score_json: score,
          ai_feedback_json: {
            v: 3,
            score,
            feedback: score.feedback ?? null,
            provider: score.provider ?? aiResult.provider,
          },
        })
        .eq('id', attemptId);
    } catch (error) {
      console.error('attempts_writing update failed', error);
    }
  }

  try {
    await supabase.from('writing_responses').insert({
      user_id: auth.user.id,
      attempt_id: attemptId ?? null,
      prompt_id: resolvedPromptId,
      task_type: taskType,
      answer_text: text,
      word_count: wordCount,
      ai_model: score.provider ?? aiResult.provider,
      overall_band: score.overall,
      task_response_band: score.breakdown.taskResponse,
      coherence_band: score.breakdown.coherence,
      lexical_band: score.breakdown.lexical,
      grammar_band: score.breakdown.grammar,
      feedback_summary: score.feedback?.summary ?? null,
      feedback_strengths: score.feedback?.strengths ?? [],
      feedback_improvements: score.feedback?.improvements ?? [],
      raw_response: aiResult.raw,
    });
  } catch (error) {
    console.error('writing_responses insert failed', error);
  }

  await trackor.log('writing_essay_scored', {
    user_id: auth.user.id,
    attempt_id: attemptId ?? null,
    prompt_id: resolvedPromptId,
    task_type: taskType,
    word_count: wordCount,
    overall: score.overall,
    breakdown: score.breakdown,
    provider: score.provider ?? aiResult.provider,
  });

  try {
    await trackor.log('writing_eval', {
      user_id: auth.user.id,
      attempt_id: attemptId ?? null,
      prompt_id: resolvedPromptId,
      task_type: taskType,
      word_count: wordCount,
      overall: score.overall,
      provider: score.provider ?? aiResult.provider,
    });

    await trackor.log('grade_submitted', {
      user_id: auth.user.id,
      attempt_id: attemptId ?? null,
      prompt_id: resolvedPromptId,
      task_type: taskType,
      overall: score.overall,
      assessment: 'writing',
    });
  } catch (error) {
    console.warn('[writing.score] analytics failed', error);
  }

  return res.status(200).json({ ok: true, attemptId: attemptId ?? undefined, score });
}

export default withPlan('starter', handler);
