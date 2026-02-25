import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { assertRole } from '@/lib/requireRole';

type SectionInput = {
  order?: number;
  orderNo?: number;
  order_no?: number;
  startMs?: number;
  start_ms?: number;
  endMs?: number;
  end_ms?: number;
  transcript?: string | null;
};

type QuestionInput = {
  qno?: number;
  questionNo?: number;
  prompt?: string;
  question_text?: string;
  type?: 'mcq' | 'gap' | 'match' | string;
  options?: unknown;
  answerKey?: unknown;
  answer_key?: unknown;
  matchLeft?: unknown;
  match_left?: unknown;
  matchRight?: unknown;
  match_right?: unknown;
  explanation?: string | null;
};

interface CreateListeningBody {
  title?: string;
  slug?: string;
  audioUrl?: string;
  audio_url?: string;
  transcript?: string | null;
  description?: string | null;
  level?: string | null;
  sections?: SectionInput[];
  questions?: QuestionInput[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeJson(value: unknown): Record<string, unknown> | unknown[] | string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed as Record<string, unknown> | unknown[];
    } catch {
      return value;
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown> | unknown[];
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let userId: string | null = null;
  try {
    const { user } = await assertRole(req, ['admin', 'teacher']);
    userId = user.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unauthorized';
    const status = message === 'unauthorized' ? 401 : 403;
    return res.status(status).json({ error: message });
  }

  const body = req.body as CreateListeningBody;
  const title = body.title?.trim();
  const audioUrl = (body.audioUrl ?? body.audio_url ?? '').toString().trim();
  const transcript = body.transcript ?? null;
  const description = body.description ?? null;
  const level = body.level ?? null;
  const sections = Array.isArray(body.sections) ? body.sections : [];
  const questions = Array.isArray(body.questions) ? body.questions : [];

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!audioUrl) {
    return res.status(400).json({ error: 'Audio URL is required' });
  }
  if (sections.length === 0) {
    return res.status(400).json({ error: 'At least one section is required' });
  }
  if (questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' });
  }

  const slugBase = body.slug?.trim() || slugify(title);
  const slug = slugify(slugBase);
  if (!slug) {
    return res.status(400).json({ error: 'Unable to derive a slug from the title' });
  }

  const sectionRows = sections
    .map((section, index) => {
      const order = coerceNumber(section.order ?? section.orderNo ?? section.order_no ?? index + 1);
      const start = coerceNumber(section.startMs ?? section.start_ms);
      const end = coerceNumber(section.endMs ?? section.end_ms);

      if (order === null || start === null || end === null) return null;

      return {
        test_slug: slug,
        order_no: Math.round(order),
        start_ms: Math.round(start),
        end_ms: Math.round(end),
        transcript: section.transcript ?? null,
      };
    })
    .filter((row): row is {
      test_slug: string;
      order_no: number;
      start_ms: number;
      end_ms: number;
      transcript: string | null;
    } => row !== null)
    .sort((a, b) => a.order_no - b.order_no);

  if (sectionRows.length === 0) {
    return res.status(400).json({ error: 'Sections are invalid' });
  }

  const questionRows = questions
    .map((question) => {
      const qno = coerceNumber(question.qno ?? question.questionNo);
      const prompt = (question.prompt ?? question.question_text ?? '').toString().trim();
      const type = question.type?.toLowerCase();

      if (!qno || !prompt || !type) return null;
      if (!['mcq', 'gap', 'match'].includes(type)) {
        return null;
      }

      return {
        test_slug: slug,
        qno: Math.round(qno),
        type,
        prompt,
        options: safeJson(question.options),
        answer_key: safeJson(question.answerKey ?? question.answer_key),
        match_left: safeJson(question.matchLeft ?? question.match_left),
        match_right: safeJson(question.matchRight ?? question.match_right),
        explanation: question.explanation ?? null,
      };
    })
    .filter((row): row is {
      test_slug: string;
      qno: number;
      type: string;
      prompt: string;
      options: ReturnType<typeof safeJson>;
      answer_key: ReturnType<typeof safeJson>;
      match_left: ReturnType<typeof safeJson>;
      match_right: ReturnType<typeof safeJson>;
      explanation: string | null;
    } => row !== null)
    .sort((a, b) => a.qno - b.qno);

  if (questionRows.length === 0) {
    return res.status(400).json({ error: 'Questions are invalid' });
  }

  try {
    const { data: insertedTest, error: testError } = await supabaseAdmin
      .from('listening_tests')
      .insert([
        {
          slug,
          title,
          audio_url: audioUrl,
          transcript,
          description,
          level,
          created_by: userId,
        },
      ])
      .select('id, slug')
      .single();

    if (testError || !insertedTest) {
      throw testError ?? new Error('Failed to create listening test');
    }

    const { error: sectionError } = await supabaseAdmin
      .from('listening_sections')
      .insert(sectionRows);

    if (sectionError) {
      await supabaseAdmin.from('listening_tests').delete().eq('slug', slug);
      throw sectionError;
    }

    const { error: questionError } = await supabaseAdmin
      .from('listening_questions')
      .insert(questionRows);

    if (questionError) {
      await supabaseAdmin.from('listening_sections').delete().eq('test_slug', slug);
      await supabaseAdmin.from('listening_tests').delete().eq('slug', slug);
      throw questionError;
    }

    const { data: verifyTest } = await supabaseAdmin
      .from('listening_tests')
      .select('id, slug, title, audio_url')
      .eq('slug', slug)
      .single();

    return res.status(201).json({
      message: 'Listening test created',
      test: verifyTest,
      sectionsInserted: sectionRows.length,
      questionsInserted: questionRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
