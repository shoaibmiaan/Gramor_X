import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { isTeacher } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  promptText: z.string().min(10, 'Prompt text must be at least 10 characters long'),
  promptType: z.string().max(120).optional(),
  sampleAnswer: z.string().optional(),
  rubricNotes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  if (!isTeacher(user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
  }

  const { title, promptText, promptType, sampleAnswer, rubricNotes } = parsed.data;

  try {
    const { data, error } = await supabaseAdmin
      .from('writing_prompts')
      .insert({
        title: title.trim(),
        prompt_text: promptText.trim(),
        prompt_type: promptType?.trim() || null,
        sample_answer: sampleAnswer?.trim() || null,
        rubric_notes: rubricNotes?.trim() || null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create prompt' });
    }

    return res.status(200).json({ prompt: data });
  } catch (error: any) {
    console.error('[admin/writing/prompts]', error);
    return res.status(500).json({ error: error?.message || 'Unexpected error' });
  }
}
