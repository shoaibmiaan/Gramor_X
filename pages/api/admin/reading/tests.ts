import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { extractRole, isTeacher } from '@/lib/roles';

const AnswerSchema = z.union([
  z.string().min(1),
  z.array(z.union([z.string().min(1), z.number()])).min(1),
  z.record(z.union([z.string().min(1), z.number()])),
]);

const QuestionSchema = z
  .object({
    orderNo: z.number().int().min(1),
    kind: z.enum(['tfng', 'mcq', 'short', 'matching']),
    prompt: z.string().min(1),
    options: z.union([z.array(z.any()), z.record(z.any())]).optional(),
    answers: AnswerSchema,
    points: z.number().int().min(0).max(100).optional(),
    explanation: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const answers = q.answers as any;
    if (typeof answers === 'string' && answers.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers'],
        message: 'Answer cannot be empty',
      });
    }

    if (Array.isArray(answers) && answers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers'],
        message: 'Provide at least one answer value',
      });
    }

    if (
      answers &&
      !Array.isArray(answers) &&
      typeof answers === 'object' &&
      Object.keys(answers).length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers'],
        message: 'Provide at least one answer mapping',
      });
    }

    if (q.kind === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'MCQ questions require at least two options',
        });
      }
    }

    if (q.kind === 'matching') {
      const pairs =
        q.options && typeof q.options === 'object' && !Array.isArray(q.options)
          ? (q.options as any).pairs
          : null;
      if (!Array.isArray(pairs) || pairs.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'Matching questions require a pairs array',
        });
      }
    }
  });

const PayloadSchema = z.object({
  slug: z.string().min(3).max(80).optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  summary: z.string().optional(),
  passageText: z.string().min(20, 'Passage text is required'),
  difficulty: z.enum(['Academic', 'General']).default('Academic'),
  words: z.number().int().min(0).max(10000).optional(),
  durationMinutes: z.number().int().min(0).max(180).optional(),
  published: z.boolean().optional(),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
});

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
  return base || 'reading-test';
}

async function ensureUniqueSlug(base: string) {
  let slug = base;
  let suffix = 1;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('reading_tests')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return slug;
    }

    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  if (!isTeacher(user)) {
    const role = extractRole(user);
    return res.status(403).json({ error: 'Forbidden', role });
  }

  const parsed = PayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
  }

  const { slug: providedSlug, title, summary, passageText, difficulty, words, durationMinutes, published, questions } =
    parsed.data;

  try {
    const baseSlug = slugify(providedSlug ?? title);
    const slug = await ensureUniqueSlug(baseSlug);

    const { data: insertedTest, error: insertErr } = await supabaseAdmin
      .from('reading_tests')
      .insert({
        slug,
        title: title.trim(),
        summary: summary?.trim() || null,
        passage_text: passageText.trim(),
        difficulty,
        words: typeof words === 'number' ? words : null,
        duration_minutes: typeof durationMinutes === 'number' ? durationMinutes : null,
        published: published ?? false,
        created_by: user.id,
      })
      .select('slug')
      .single();

    if (insertErr || !insertedTest) {
      return res.status(500).json({ error: insertErr?.message || 'Failed to create reading test' });
    }

    const sortedQuestions = [...questions].sort((a, b) => a.orderNo - b.orderNo);
    const questionRows = sortedQuestions.map((q) => {
      const normalizedOptions = Array.isArray(q.options)
        ? q.options.map((opt) => (typeof opt === 'string' ? opt.trim() : opt))
        : q.options && typeof q.options === 'object'
        ? (() => {
            const base: Record<string, any> = { ...q.options };
            if (Array.isArray(base.options)) {
              base.options = base.options.map((opt: any) =>
                typeof opt === 'string' ? opt.trim() : opt,
              );
            }
            if (Array.isArray(base.pairs)) {
              base.pairs = base.pairs.map((pair: any) => ({
                ...pair,
                left: typeof pair?.left === 'string' ? pair.left.trim() : pair?.left,
                right: Array.isArray(pair?.right)
                  ? pair.right.map((r: any) => (typeof r === 'string' ? r.trim() : r))
                  : typeof pair?.right === 'string'
                  ? pair.right.trim()
                  : pair?.right,
              }));
            }
            return base;
          })()
        : null;

      const normalizedAnswers = Array.isArray(q.answers)
        ? q.answers.map((ans) => (typeof ans === 'string' ? ans.trim() : ans))
        : typeof q.answers === 'string'
        ? q.answers.trim()
        : q.answers && typeof q.answers === 'object'
        ? Object.fromEntries(
            Object.entries(q.answers).map(([key, value]) => [
              key,
              typeof value === 'string' ? value.trim() : value,
            ]),
          )
        : q.answers;

      return {
        passage_slug: slug,
        order_no: q.orderNo,
        kind: q.kind,
        prompt: q.prompt.trim(),
        options: normalizedOptions,
        answers: normalizedAnswers,
        points: typeof q.points === 'number' ? q.points : 1,
        explanation: q.explanation?.trim() || null,
      };
    });

    const { error: qErr } = await supabaseAdmin.from('reading_questions').insert(questionRows);

    if (qErr) {
      await supabaseAdmin.from('reading_tests').delete().eq('slug', slug);
      return res.status(500).json({ error: qErr.message || 'Failed to save questions' });
    }

    return res.status(200).json({ ok: true, slug });
  } catch (error: any) {
    console.error('[admin/reading/tests]', error);
    return res.status(500).json({ error: error?.message || 'Unexpected error' });
  }
}
