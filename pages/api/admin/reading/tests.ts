import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { extractRole } from '@/lib/roles';

const MCQSchema = z.object({
  type: z.literal('mcq'),
  prompt: z.string().min(1, 'Prompt is required'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2).max(6),
  correctIndex: z.number().int().min(0),
});

const TFNGSchema = z.object({
  type: z.literal('tfng'),
  prompt: z.string().min(1, 'Prompt is required'),
  answer: z.enum(['True', 'False', 'Not Given']),
});

const ShortSchema = z.object({
  type: z.literal('short'),
  prompt: z.string().min(1, 'Prompt is required'),
  answers: z.array(z.string().min(1, 'Answer cannot be empty')).min(1),
});

const QuestionSchema = z.discriminatedUnion('type', [MCQSchema, TFNGSchema, ShortSchema]);

const PayloadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().optional(),
  difficulty: z.string().min(1, 'Difficulty is required'),
  passage: z.string().min(20, 'Passage text is required'),
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
      .from('reading_passages')
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

type ExistingRow = {
  slug: string;
  title: string;
  difficulty: string | null;
  words: number | null;
  created_at: string | null;
};

type QuestionRow = {
  passage_slug: string;
  order_no: number;
  kind: 'mcq' | 'tfng' | 'short';
  prompt: string;
  options: string[] | null;
  answers: string[];
  points: number;
};

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const role = extractRole(user);
  if (role !== 'admin' && role !== 'teacher') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const { data: passages, error: passErr } = await supabaseAdmin
        .from('reading_passages')
        .select('slug,title,difficulty,words,created_at')
        .order('created_at', { ascending: false });

      if (passErr) {
        return res.status(500).json({ error: passErr.message });
      }

      if (!passages || passages.length === 0) {
        return res.json([]);
      }

      const slugs = passages.map((p: ExistingRow) => p.slug);

      const { data: questionRows, error: qErr } = await supabaseAdmin
        .from('reading_questions')
        .select('passage_slug')
        .in('passage_slug', slugs);

      if (qErr) {
        return res.status(500).json({ error: qErr.message });
      }

      const counts = new Map<string, number>();
      for (const row of questionRows ?? []) {
        const key = (row as { passage_slug: string }).passage_slug;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const payload = passages.map((p: ExistingRow) => ({
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty ?? 'Academic',
        words: typeof p.words === 'number' ? p.words : null,
        questionCount: counts.get(p.slug) ?? 0,
        createdAt: p.created_at,
      }));

      return res.json(payload);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Failed to load passages' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = PayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const { title, slug: providedSlug, difficulty, passage, questions } = parsed.data;

  const trimmedTitle = title.trim();
  const trimmedPassage = passage.trim();

  if (!trimmedPassage) {
    return res.status(400).json({ error: 'Passage text is required' });
  }

  try {
    const baseSlug = slugify(providedSlug ?? trimmedTitle);
    const slug = await ensureUniqueSlug(baseSlug);

    const words = countWords(trimmedPassage);

    const { data: insertedPassage, error: insertPassageError } = await supabaseAdmin
      .from('reading_passages')
      .insert({
        slug,
        title: trimmedTitle,
        difficulty,
        words: words > 0 ? words : null,
        content: trimmedPassage,
      })
      .select('slug')
      .single();

    if (insertPassageError || !insertedPassage) {
      return res.status(500).json({ error: insertPassageError?.message || 'Failed to save passage' });
    }

    const questionRows: QuestionRow[] = questions.map((q, idx) => {
      if (q.type === 'mcq') {
        const trimmedOptions = q.options.map((opt) => opt.trim());
        const filteredOptions = trimmedOptions.filter(Boolean);
        const answerCandidate = trimmedOptions[q.correctIndex]?.trim();
        const answer = answerCandidate && answerCandidate.length > 0 ? answerCandidate : filteredOptions[0];
        return {
          passage_slug: slug,
          order_no: idx + 1,
          kind: 'mcq',
          prompt: q.prompt.trim(),
          options: filteredOptions,
          answers: answer ? [answer] : [],
          points: 1,
        };
      }

      if (q.type === 'tfng') {
        return {
          passage_slug: slug,
          order_no: idx + 1,
          kind: 'tfng',
          prompt: q.prompt.trim(),
          options: null,
          answers: [q.answer],
          points: 1,
        };
      }

      const acceptable = q.answers.map((ans) => ans.trim()).filter(Boolean);
      return {
        passage_slug: slug,
        order_no: idx + 1,
        kind: 'short',
        prompt: q.prompt.trim(),
        options: null,
        answers: acceptable,
        points: 1,
      };
    });

    const { error: questionsError } = await supabaseAdmin
      .from('reading_questions')
      .insert(questionRows);

    if (questionsError) {
      await supabaseAdmin.from('reading_passages').delete().eq('slug', slug);
      return res.status(500).json({ error: questionsError.message || 'Failed to save questions' });
    }

    return res.status(200).json({ ok: true, slug });
  } catch (error: any) {
    console.error('[admin/reading/tests]', error);
    return res.status(500).json({ error: error?.message || 'Unexpected error' });
  }
}
