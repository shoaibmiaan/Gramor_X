import { randomUUID } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';

const BodySchema = z.object({
  refType: z.enum(['exercise', 'free_speech']),
  exerciseSlug: z.string().trim().min(1).max(120).optional(),
  refText: z.string().trim().max(2000).optional(),
  durationMs: z.number().int().positive(),
  audioB64: z.string().min(1),
});

export default withPlan(
  'starter',
  async function uploadHandler(req: NextApiRequest, res: NextApiResponse, ctx) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const parse = BodySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
    }

    const { refType, exerciseSlug, refText, durationMs, audioB64 } = parse.data;

    const supabase = ctx.supabase;
    const user = ctx.user;

    if (refType === 'exercise' && !exerciseSlug) {
      return res.status(400).json({ error: 'exerciseSlug required for exercise attempts' });
    }

    let exerciseId: string | null = null;
    if (refType === 'exercise' && exerciseSlug) {
      const { data: exerciseRow, error: exerciseError } = await supabase
        .from('speaking_exercises')
        .select('id')
        .eq('slug', exerciseSlug)
        .maybeSingle();

      if (exerciseError) {
        return res.status(500).json({ error: 'Failed to load exercise' });
      }

      if (!exerciseRow) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      exerciseId = exerciseRow.id;
    }

    let audioBuffer: Buffer;
    try {
      audioBuffer = Buffer.from(audioB64, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid audio encoding' });
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return res.status(400).json({ error: 'Audio payload empty' });
    }

    const attemptId = randomUUID();
    const storagePath = `${user.id}/${attemptId}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('speaking-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const { error: insertError } = await supabase.from('speaking_attempts').insert({
      id: attemptId,
      user_id: user.id,
      exercise_id: exerciseId,
      ref_type: refType,
      ref_text: refType === 'free_speech' ? refText ?? null : null,
      audio_path: storagePath,
      duration_ms: durationMs,
    });

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ attemptId, audioPath: storagePath });
  },
  { allowRoles: ['teacher', 'admin'] },
);
