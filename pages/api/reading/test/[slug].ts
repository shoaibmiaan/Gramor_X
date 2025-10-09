import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

type DbQuestion = {
  id: string;
  order_no: number | null;
  kind: string | null;
  prompt: string | null;
  options: Record<string, any> | null;
  answers: unknown;
  points: number | null;
};

type DbTest = {
  slug: string;
  title: string | null;
  summary: string | null;
  passage_text: string | null;
  difficulty: string | null;
  words: number | null;
  duration_minutes: number | null;
  published: boolean | null;
};

type RunnerQuestion =
  | { id: string; qNo: number; type: 'tfng'; prompt: string; rationale?: string | null }
  | { id: string; qNo: number; type: 'ynng'; prompt: string; rationale?: string | null }
  | { id: string; qNo: number; type: 'gap'; prompt: string; acceptable?: string[]; rationale?: string | null }
  | { id: string; qNo: number; type: 'mcq'; prompt: string; options: string[]; rationale?: string | null }
  | {
      id: string;
      qNo: number;
      type: 'match';
      prompt: string;
      options: string[];
      pairs: { left: string; right: string[] }[];
      rationale?: string | null;
    };

type RunnerSection = {
  orderNo: number;
  title?: string;
  instructions?: string;
  questions: RunnerQuestion[];
};

type RunnerResponse = {
  slug: string;
  title: string;
  summary?: string | null;
  difficulty?: string | null;
  words?: number | null;
  passage: string;
  durationMinutes: number;
  sections: RunnerSection[];
};

type RunnerWithAnswers = RunnerResponse & {
  sections: Array<RunnerSection & { questions: Array<RunnerQuestion & { correct: unknown }> }>;
};

function extractRationale(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;
  const candidate = obj.rationale ?? obj.explanation ?? obj.feedback ?? null;
  return typeof candidate === 'string' ? candidate : null;
}

function normaliseChoices(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : String(item ?? ''))).filter(Boolean);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function mapQuestion(row: DbQuestion, includeAnswer: boolean): RunnerQuestion & { correct?: unknown } {
  const id = row.id;
  const qNo = typeof row.order_no === 'number' ? row.order_no : Number(row.order_no ?? 0) || 0;
  const prompt = String(row.prompt ?? '').trim();
  const kind = (row.kind ?? '').toLowerCase();
  const options = (row.options && typeof row.options === 'object' ? row.options : {}) as Record<string, any>;
  const choices = normaliseChoices(options.choices);
  const variant = typeof options.variant === 'string' ? options.variant.toLowerCase() : null;

  const baseAnswer = includeAnswer ? row.answers ?? null : undefined;
  const acceptableFromOptions = Array.isArray(options.acceptable)
    ? options.acceptable.map((item: any) => (typeof item === 'string' ? item : String(item ?? '')))
    : null;

  if (kind === 'tfng') {
    const rationale = extractRationale(options);
    const qType = variant === 'ynng' ? 'ynng' : 'tfng';
    return includeAnswer
      ? ({ id, qNo, type: qType, prompt, rationale, correct: Array.isArray(baseAnswer) ? baseAnswer[0] : baseAnswer } as any)
      : ({ id, qNo, type: qType, prompt, rationale } as any);
  }

  if (kind === 'short') {
    const acceptableAnswers = acceptableFromOptions ?? (Array.isArray(baseAnswer) ? baseAnswer : asArray(baseAnswer));
    const rationale = extractRationale(options);
    return includeAnswer
      ? ({ id, qNo, type: 'gap', prompt, acceptable: acceptableAnswers as string[], rationale, correct: baseAnswer } as any)
      : ({ id, qNo, type: 'gap', prompt, rationale } as any);
  }

  if (kind === 'matching') {
    const pairs = Array.isArray(options.pairs) ? options.pairs : [];
    const rationale = extractRationale(options);
    return includeAnswer
      ? ({
          id,
          qNo,
          type: 'match',
          prompt,
          options: choices,
          pairs: pairs.map((pair) => ({
            left: typeof pair?.left === 'string' ? pair.left : String(pair?.left ?? ''),
            right: Array.isArray(pair?.right)
              ? pair.right.map((r: any) => (typeof r === 'string' ? r : String(r ?? '')))
              : [typeof pair?.right === 'string' ? pair.right : String(pair?.right ?? '')].filter(Boolean),
          })),
          rationale,
          correct: baseAnswer,
        } as any)
      : ({
          id,
          qNo,
          type: 'match',
          prompt,
          options: choices,
          pairs: pairs.map((pair) => ({
            left: typeof pair?.left === 'string' ? pair.left : String(pair?.left ?? ''),
            right: Array.isArray(pair?.right)
              ? pair.right.map((r: any) => (typeof r === 'string' ? r : String(r ?? '')))
              : [typeof pair?.right === 'string' ? pair.right : String(pair?.right ?? '')].filter(Boolean),
          })),
          rationale,
        } as any);
  }

  // default MCQ
  const asMatch = variant === 'matching-single' && Array.isArray(options.pairs);
  if (asMatch) {
    const pairs = Array.isArray(options.pairs) ? options.pairs : [];
    const rationale = extractRationale(options);
    return includeAnswer
      ? ({
          id,
          qNo,
          type: 'match',
          prompt,
          options: choices,
          pairs: pairs.map((pair) => ({
            left: typeof pair?.left === 'string' ? pair.left : String(pair?.left ?? ''),
            right: Array.isArray(pair?.right)
              ? pair.right.map((r: any) => (typeof r === 'string' ? r : String(r ?? '')))
              : [typeof pair?.right === 'string' ? pair.right : String(pair?.right ?? '')].filter(Boolean),
          })),
          rationale,
          correct: baseAnswer,
        } as any)
      : ({
          id,
          qNo,
          type: 'match',
          prompt,
          options: choices,
          pairs: pairs.map((pair) => ({
            left: typeof pair?.left === 'string' ? pair.left : String(pair?.left ?? ''),
            right: Array.isArray(pair?.right)
              ? pair.right.map((r: any) => (typeof r === 'string' ? r : String(r ?? '')))
              : [typeof pair?.right === 'string' ? pair.right : String(pair?.right ?? '')].filter(Boolean),
          })),
          rationale,
        } as any);
  }

  const rationale = extractRationale(options);
  return includeAnswer
    ? ({ id, qNo, type: 'mcq', prompt, options: choices, rationale, correct: baseAnswer } as any)
    : ({ id, qNo, type: 'mcq', prompt, options: choices, rationale } as any);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RunnerResponse | RunnerWithAnswers | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query as { slug?: string };
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const includeAnswers = req.query.answers === '1' || req.query.answers === 'true';

  const { data: test, error: testError } = await supabaseAdmin
    .from<DbTest>('reading_tests')
    .select('slug,title,summary,passage_text,difficulty,words,duration_minutes,published')
    .eq('slug', slug)
    .maybeSingle();

  if (testError) {
    return res.status(500).json({ error: testError.message || 'Failed to load reading test' });
  }
  if (!test || test.published === false) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const { data: questionRows, error: qError } = await supabaseAdmin
    .from<DbQuestion>('reading_questions')
    .select('id,order_no,kind,prompt,options,answers,points')
    .eq('passage_slug', slug)
    .order('order_no', { ascending: true });

  if (qError) {
    return res.status(500).json({ error: qError.message || 'Failed to load questions' });
  }

  if (!questionRows || questionRows.length === 0) {
    return res.status(404).json({ error: 'Questions not found' });
  }

  const mappedQuestions = questionRows.map((row) => mapQuestion(row, includeAnswers));

  const response: RunnerResponse = {
    slug: test.slug,
    title: test.title ?? 'Reading Passage',
    summary: test.summary,
    difficulty: test.difficulty,
    words: test.words,
    passage: test.passage_text ?? '',
    durationMinutes: typeof test.duration_minutes === 'number' ? test.duration_minutes : 20,
    sections: [
      {
        orderNo: 1,
        title: test.summary ?? test.title ?? undefined,
        instructions: undefined,
        questions: mappedQuestions as RunnerQuestion[],
      },
    ],
  };

  if (includeAnswers) {
    return res.status(200).json(response as RunnerWithAnswers);
  }

  return res.status(200).json(response);
}
