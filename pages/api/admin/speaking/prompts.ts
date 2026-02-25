import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { extractRole } from '@/lib/roles';

const PromptPayloadSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(160, 'Title must be at most 160 characters'),
  prompt: z
    .string({ required_error: 'Prompt text is required' })
    .trim()
    .min(10, 'Prompt must be at least 10 characters'),
  partType: z
    .enum(['part1', 'part2', 'part3', 'general'], {
      invalid_type_error: 'Invalid part type',
    })
    .optional(),
  estimatedMinutes: z
    .number()
    .int('Estimated minutes must be a whole number')
    .min(0, 'Estimated minutes cannot be negative')
    .max(60, 'Estimated minutes must be less than 60')
    .optional(),
});

function mapPartType(part?: string | null) {
  if (!part || part === 'general') return null;
  return part;
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
    const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 100;

    if (Number.isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Invalid limit' });
    }

    const { data, error } = await supabaseAdmin
      .from('speaking_prompts')
      .select('id,title,prompt,part_type,estimated_minutes,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to load prompts' });
    }

    return res.status(200).json({ prompts: data ?? [] });
  }

  if (req.method === 'POST') {
    const parsed = PromptPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid payload',
        issues: parsed.error.flatten(),
      });
    }

    const { title, prompt, partType, estimatedMinutes } = parsed.data;

    const insertPayload = {
      title,
      prompt,
      part_type: mapPartType(partType ?? null),
      estimated_minutes: estimatedMinutes ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from('speaking_prompts')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to save prompt' });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

