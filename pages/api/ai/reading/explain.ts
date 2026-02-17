import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  attemptId: z.string().uuid(),
  section: z.string().min(1).max(32).default('overall'),
  locale: z.enum(['en']).default('en'),
});

export type ReadingExplainReason = {
  questionId: string;
  prompt: string;
  userAnswer: string | null;
  correctAnswer: string | null;
  why: string;
  passageSnippet: string | null;
};

export type ReadingExplainResponse =
  | {
      ok: true;
      attemptId: string;
      section: string;
      summary: string;
      focus: string[];
      reasons: ReadingExplainReason[];
    }
  | { ok: false; error: string; code?: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'DB_ERROR' };

type CachedEntry = {
  payload: Extract<ReadingExplainResponse, { ok: true }>;
  expiresAt: number;
};

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes in-memory
const memoryCache = new Map<string, CachedEntry>();

async function handler(req: NextApiRequest, res: NextApiResponse<ReadingExplainResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed', code: 'BAD_REQUEST' });
  }

  const parse = BodySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, error: parse.error.message, code: 'BAD_REQUEST' });
  }

  const { attemptId, section } = parse.data;
  const cacheKey = `${attemptId}:${section}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return res.status(200).json(cached.payload);
  }

  const supabase = supabaseServer(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthenticated', code: 'UNAUTHORIZED' });
  }

  const existing = await supabaseAdmin
    .from('reading_explanations')
    .select('attempt_id, section, summary, reasons')
    .eq('attempt_id', attemptId)
    .eq('section', section)
    .maybeSingle();

  if (existing.data && !existing.error) {
    const payload: Extract<ReadingExplainResponse, { ok: true }> = {
      ok: true,
      attemptId,
      section,
      summary: existing.data.summary ?? '',
      focus: normaliseFocus(existing.data.focus),
      reasons: normaliseReasons(existing.data.reasons),
    };
    memoryCache.set(cacheKey, { payload, expiresAt: now + CACHE_TTL_MS });
    return res.status(200).json(payload);
  }

  const attempt = await supabaseAdmin
    .from('reading_responses')
    .select('id, user_id, passage_slug, result_json')
    .eq('id', attemptId)
    .maybeSingle();

  if (attempt.error) {
    return res.status(500).json({ ok: false, error: attempt.error.message, code: 'DB_ERROR' });
  }

  const row = attempt.data;
  if (!row) {
    return res.status(404).json({ ok: false, error: 'Attempt not found', code: 'NOT_FOUND' });
  }

  if (row.user_id !== user.id) {
    return res.status(403).json({ ok: false, error: 'Forbidden', code: 'UNAUTHORIZED' });
  }

  const resultJson = (row.result_json as any) ?? {};
  const items = Array.isArray(resultJson.items) ? resultJson.items : [];
  const incorrect = items.filter((item) => !item?.isCorrect);

  const passageRes = await supabaseAdmin
    .from('reading_passages')
    .select('content, title')
    .eq('slug', row.passage_slug)
    .maybeSingle();

  const passageText = passageRes.data?.content ? String(passageRes.data.content) : '';
  const summaryPayload = buildSummary(items, incorrect, resultJson.breakdown);
  const reasons = incorrect.map((item: any) =>
    buildReason(item, passageText),
  );

  const payload: Extract<ReadingExplainResponse, { ok: true }> = {
    ok: true,
    attemptId,
    section,
    summary: summaryPayload.summary,
    focus: summaryPayload.focusTags,
    reasons,
  };

  await supabaseAdmin
    .from('reading_explanations')
    .upsert(
      {
        attempt_id: attemptId,
        section,
        summary: summaryPayload.summary,
        focus: summaryPayload.focusSerialised,
        reasons,
        model: 'heuristic:v1',
        tokens: null,
        raw: null,
      },
      { onConflict: 'attempt_id,section' },
    );

  memoryCache.set(cacheKey, { payload, expiresAt: now + CACHE_TTL_MS });
  return res.status(200).json(payload);
}

function normaliseReasons(raw: unknown): ReadingExplainReason[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => ({
      questionId: String((entry as any)?.questionId ?? (entry as any)?.question_id ?? ''),
      prompt: String((entry as any)?.prompt ?? ''),
      userAnswer: normaliseNullable((entry as any)?.userAnswer ?? (entry as any)?.user_answer),
      correctAnswer: normaliseNullable((entry as any)?.correctAnswer ?? (entry as any)?.correct_answer),
      why: String((entry as any)?.why ?? ''),
      passageSnippet: normaliseNullable((entry as any)?.passageSnippet ?? (entry as any)?.passage_snippet),
    }))
    .filter((entry) => entry.questionId);
}

function normaliseNullable(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

type SummaryComputation = {
  summary: string;
  focusSerialised: string | null;
  focusTags: string[];
};

function normaliseFocus(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '')).trim())
      .filter((value) => value.length > 0);
  }

  if (raw == null) return [];

  const str = String(raw).trim();
  if (!str) return [];

  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '')).trim())
        .filter((value) => value.length > 0);
    }
  } catch (_err) {
    // Ignore JSON parse errors and fall back to delimiter-based parsing.
  }

  return str
    .split(/\||,|•|&/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function buildSummary(items: any[], incorrect: any[], breakdown: any): SummaryComputation {
  const total = items.length;
  if (!total) {
    return {
      summary: 'No questions available for this attempt.',
      focusSerialised: null,
      focusTags: [],
    };
  }

  const missed = incorrect.length;
  const accuracy = total > 0 ? Math.round(((total - missed) / total) * 100) : 0;
  const weakTypes = extractWeakTypes(breakdown, incorrect);
  const focusSentence = weakTypes.length
    ? `Focus on ${formatFocusSentence(weakTypes)} questions.`
    : 'Great job staying consistent across types.';
  const base = `You answered ${total - missed} of ${total} correctly (${accuracy}% accuracy). ${focusSentence}`;

  return {
    summary: safeTruncate(base, 320),
    focusSerialised: weakTypes.length ? JSON.stringify(weakTypes) : null,
    focusTags: weakTypes,
  };
}

function extractWeakTypes(breakdown: any, incorrect: any[]): string[] {
  const counts = new Map<string, { incorrect: number; total: number }>();
  incorrect.forEach((item) => {
    const type = String(item?.type ?? '');
    const entry = counts.get(type) ?? { incorrect: 0, total: 0 };
    entry.incorrect += 1;
    entry.total += 1;
    counts.set(type, entry);
  });

  if (breakdown && typeof breakdown === 'object') {
    Object.entries(breakdown as Record<string, any>).forEach(([type, value]) => {
      const entry = counts.get(type) ?? { incorrect: 0, total: 0 };
      entry.total = typeof value?.total === 'number' ? value.total : entry.total;
      if (typeof value?.total === 'number' && typeof value?.correct === 'number') {
        entry.incorrect = Math.max(entry.total - value.correct, entry.incorrect);
      }
      counts.set(type, entry);
    });
  }

  const sorted = Array.from(counts.entries())
    .filter(([, value]) => value.total > 0)
    .sort((a, b) => b[1].incorrect / b[1].total - a[1].incorrect / a[1].total)
    .slice(0, 2)
    .map(([type]) => labelType(type));

  return sorted;
}

function formatFocusSentence(types: string[]): string {
  if (types.length === 0) return '';
  if (types.length === 1) return types[0];
  if (types.length === 2) return `${types[0]} & ${types[1]}`;
  const head = types.slice(0, -1).join(', ');
  const tail = types[types.length - 1];
  return `${head}, & ${tail}`;
}

function buildReason(item: any, passage: string): ReadingExplainReason {
  const questionId = String(item?.id ?? '');
  const prompt = String(item?.prompt ?? '');
  const userAnswer = stringifyAnswer(item?.user);
  const correctAnswer = stringifyAnswer(item?.correct);
  const snippet = passage ? extractSnippet(passage, correctAnswer || prompt) : null;
  const why = createWhyMessage(prompt, userAnswer, correctAnswer, snippet);

  return {
    questionId,
    prompt,
    userAnswer,
    correctAnswer,
    why,
    passageSnippet: snippet,
  };
}

function stringifyAnswer(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    const joined = value.map((val) => stringifyAnswer(val) ?? '').filter(Boolean).join(', ');
    return joined || null;
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((val) => stringifyAnswer(val) ?? '')
      .filter(Boolean)
      .join(', ') || null;
  }
  return String(value);
}

function extractSnippet(passage: string, needle?: string | null, fallback?: string): string | null {
  const text = passage || '';
  if (!text) return null;

  const normal = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
  const radius = 90;

  const chooseNeedle = (candidate?: string | null) => {
    if (!candidate) return null;
    const trimmed = candidate.replace(/["'`]/g, '').trim();
    if (!trimmed) return null;
    return trimmed;
  };

  const firstNeedle = chooseNeedle(needle) ?? chooseNeedle(fallback);
  if (!firstNeedle) {
    return text.slice(0, 160) + (text.length > 160 ? '…' : '');
  }

  const index = normal(text).indexOf(normal(firstNeedle));
  if (index < 0) {
    return text.slice(0, 160) + (text.length > 160 ? '…' : '');
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + firstNeedle.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function createWhyMessage(
  prompt: string,
  userAnswer: string | null,
  correctAnswer: string | null,
  snippet: string | null,
): string {
  const parts: string[] = [];
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt) {
    parts.push(`Question focus: ${trimmedPrompt}`);
  }

  if (!userAnswer) {
    parts.push('You left this blank.');
  } else if (correctAnswer && userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
    parts.push('Your answer matches the passage.');
  } else if (correctAnswer) {
    parts.push(`Your answer does not match the evidence supporting "${correctAnswer}".`);
  } else {
    parts.push('Your answer does not match the supporting sentence.');
  }

  if (snippet) {
    parts.push(`Re-read: ${snippet}`);
  }

  return parts.join(' ');
}

function safeTruncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, maxLength);
  const lastPeriod = slice.lastIndexOf('.');
  const lastSentenceBreak = Math.max(lastPeriod, slice.lastIndexOf('!'), slice.lastIndexOf('?'));
  if (lastSentenceBreak > maxLength * 0.6) {
    return slice.slice(0, lastSentenceBreak + 1).trim();
  }
  return `${slice.trim()}…`;
}

function labelType(type: string): string {
  const lower = type.toLowerCase();
  if (lower === 'tfng') return 'True/False/Not Given';
  if (lower === 'ynng') return 'Yes/No/Not Given';
  if (lower === 'matching') return 'Matching';
  if (lower === 'short') return 'Short answer';
  return 'Multiple choice';
}

export default withPlan('starter', handler);
