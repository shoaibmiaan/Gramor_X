import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { isTeacher } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerClient } from '@/lib/supabaseServer';

const promptSchema = z.object({
  title: z.string().min(3),
  promptText: z.string().min(20),
  taskType: z.enum(['task1', 'task2']),
  module: z.enum(['academic', 'general_training']).default('academic'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  wordTarget: z.number().int().positive().optional(),
});

const updateSchema = promptSchema.partial({
  title: true,
  promptText: true,
  taskType: true,
  module: true,
  difficulty: true,
  source: true,
  tags: true,
  estimatedMinutes: true,
  wordTarget: true,
}).extend({ id: z.string().uuid() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient(req, res);
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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('writing_prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ prompts: data ?? [] });
  }

  if (req.method === 'POST') {
    const parsed = promptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
    }

    const { title, promptText, taskType, module, difficulty, source, tags, estimatedMinutes, wordTarget } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('writing_prompts')
      .insert({
        title: title.trim(),
        prompt_text: promptText.trim(),
        task_type: taskType,
        module,
        difficulty,
        source: source?.trim() ?? null,
        tags: tags ?? null,
        estimated_minutes: estimatedMinutes ?? null,
        word_target: wordTarget ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create prompt' });
    }

    return res.status(200).json({ prompt: data });
  }

  if (req.method === 'PUT') {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
    }
    const { id, ...rest } = parsed.data;
    const updatePayload: Record<string, unknown> = {};
    if (rest.title) updatePayload.title = rest.title.trim();
    if (rest.promptText) updatePayload.prompt_text = rest.promptText.trim();
    if (rest.taskType) updatePayload.task_type = rest.taskType;
    if (rest.module) updatePayload.module = rest.module;
    if (rest.difficulty) updatePayload.difficulty = rest.difficulty;
    if (rest.source !== undefined) updatePayload.source = rest.source ? rest.source.trim() : null;
    if (rest.tags !== undefined) updatePayload.tags = rest.tags ?? null;
    if (rest.estimatedMinutes !== undefined) updatePayload.estimated_minutes = rest.estimatedMinutes;
    if (rest.wordTarget !== undefined) updatePayload.word_target = rest.wordTarget;

    const { data, error } = await supabaseAdmin
      .from('writing_prompts')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to update prompt' });
    }

    return res.status(200).json({ prompt: data });
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string) ?? (req.body?.id as string);
    if (!id) {
      return res.status(400).json({ error: 'Missing prompt id' });
    }
    const { error } = await supabaseAdmin.from('writing_prompts').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET,POST,PUT,DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
