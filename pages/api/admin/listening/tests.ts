import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { extractRole } from '@/lib/roles';

const QuestionSchema = z
  .object({
    prompt: z.string().min(1, 'Question prompt is required'),
    options: z.array(z.string().min(1, 'Option cannot be empty')).min(2).max(6),
    correctOption: z.number().int().min(0),
  })
  .refine((q) => q.correctOption < q.options.length, {
    message: 'Correct option must reference an existing choice',
    path: ['correctOption'],
  });

const PayloadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().optional(),
  audioUrl: z.string().url('Audio URL is required'),
  storagePath: z.string().optional(),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
});

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
  return base || 'listening-test';
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

async function ensureUniqueSlug(base: string) {
  let slug = base;
  let suffix = 1;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('listening_tests')
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

  if (extractRole(user) !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parsed = PayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
  }

  const { title, slug: providedSlug, audioUrl, questions } = parsed.data;

  try {
    const baseSlug = slugify(providedSlug ?? title);
    const slug = await ensureUniqueSlug(baseSlug);

    const { data: insertedTest, error: insertErr } = await supabaseAdmin
      .from('listening_tests')
      .insert({
        slug,
        title: title.trim(),
        audio_url: audioUrl,
      })
      .select('slug')
      .single();

    if (insertErr || !insertedTest) {
      return res.status(500).json({ error: insertErr?.message || 'Failed to create test' });
    }

    const questionRows = questions.map((q, idx) => ({
      test_slug: slug,
      qno: idx + 1,
      type: 'mcq',
      prompt: q.prompt.trim(),
      options: q.options.map((opt) => opt.trim()),
      answer_key: { value: LETTERS[q.correctOption] ?? LETTERS[0] },
    }));

    const { error: qErr } = await supabaseAdmin
      .from('listening_questions')
      .insert(questionRows);

    if (qErr) {
      await supabaseAdmin.from('listening_tests').delete().eq('slug', slug);
      return res.status(500).json({ error: qErr.message || 'Failed to save questions' });
    }

    return res.status(200).json({ ok: true, slug });
  } catch (error: any) {
    console.error('[admin/listening/tests]', error);
    return res.status(500).json({ error: error?.message || 'Unexpected error' });
  }
}
