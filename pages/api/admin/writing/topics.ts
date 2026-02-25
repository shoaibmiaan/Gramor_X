// pages/api/admin/writing/topics.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const difficultyEnum = ['starter', 'intermediate', 'advanced'] as const;

const BaseSchema = z.object({
  title: z.string().min(3).max(200),
  prompt: z.string().min(10).max(4000),
  bandTarget: z.number().min(4).max(9),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
  difficulty: z.enum(difficultyEnum),
  archived: z.boolean().optional(),
});

const CreateSchema = BaseSchema;
const UpdateSchema = BaseSchema.partial({ archived: true }).extend({ id: z.string().uuid() });

function mapTopic(row: any) {
  return {
    id: row.id as string,
    title: row.title as string,
    prompt: row.prompt as string,
    bandTarget: Number(row.band_target ?? 0),
    tags: (row.tags as string[]) ?? [],
    difficulty: row.difficulty as (typeof difficultyEnum)[number],
    archivedAt: row.archived_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse, _ctx: PlanGuardContext) {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('writing_topics')
      .select('id, title, prompt, band_target, tags, difficulty, archived_at, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to load topics' });
    }

    return res.status(200).json({ topics: (data ?? []).map(mapTopic) });
  }

  if (req.method === 'POST') {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const { title, prompt, bandTarget, tags, difficulty, archived } = parsed.data;
    const payload = {
      title,
      prompt,
      band_target: bandTarget,
      tags,
      difficulty,
      archived_at: archived ? new Date().toISOString() : null,
    };

    const { data, error } = await supabaseAdmin
      .from('writing_topics')
      .insert(payload)
      .select('id, title, prompt, band_target, tags, difficulty, archived_at, created_at, updated_at')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: 'Failed to create topic' });
    }

    return res.status(200).json({ ok: true, topic: mapTopic(data) });
  }

  if (req.method === 'PUT') {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const { id, title, prompt, bandTarget, tags, difficulty, archived } = parsed.data;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (prompt !== undefined) updates.prompt = prompt;
    if (bandTarget !== undefined) updates.band_target = bandTarget;
    if (tags !== undefined) updates.tags = tags;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (archived !== undefined) {
      updates.archived_at = archived ? new Date().toISOString() : null;
    }

    const { data, error } = await supabaseAdmin
      .from('writing_topics')
      .update(updates)
      .eq('id', id)
      .select('id, title, prompt, band_target, tags, difficulty, archived_at, created_at, updated_at')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: 'Failed to update topic' });
    }

    return res.status(200).json({ ok: true, topic: mapTopic(data) });
  }

  if (req.method === 'DELETE') {
    const id = z.string().uuid().safeParse(req.query.id ?? req.body?.id);
    if (!id.success) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const { error } = await supabaseAdmin.from('writing_topics').delete().eq('id', id.data);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete topic' });
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET,POST,PUT,DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPlan('master', handler, { allowRoles: ['admin'] });
