import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import { scoreAudio, type WordScore, type PhonemeScore } from '@/lib/speaking/scoreAudio';

const BodySchema = z.object({
  attemptId: z.string().uuid(),
});

type ScoreResponse = {
  attemptId: string;
  overall: {
    pron: number;
    intonation: number;
    stress: number;
    fluency: number;
    band: number;
    wpm: number;
    fillers: number;
  };
  weakIPA: string[];
  words: WordScore[];
  phonemes: PhonemeScore[];
};

export default withPlan(
  'starter',
  async function scoreHandler(req: NextApiRequest, res: NextApiResponse, ctx) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const parse = BodySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
    }

    const { attemptId } = parse.data;

    const { data: attempt, error: attemptError } = await ctx.supabase
      .from('speaking_attempts')
      .select('id, user_id, audio_path, exercise_id, duration_ms')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError) {
      return res.status(500).json({ error: 'Failed to load attempt' });
    }

    if (!attempt || attempt.user_id !== ctx.user.id) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const { data: signedUrlData, error: signedUrlError } = await ctx.supabase.storage
      .from('speaking-audio')
      .createSignedUrl(attempt.audio_path, 60 * 15);

    if (signedUrlError) {
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }

    const result = await scoreAudio({
      attemptId,
      audioUrl: signedUrlData?.signedUrl ?? null,
    });

    const { error: updateError } = await ctx.supabase
      .from('speaking_attempts')
      .update({
        wpm: result.overall.wpm,
        fillers_count: result.overall.fillers,
        overall_pron: result.overall.pron,
        overall_intonation: result.overall.intonation,
        overall_stress: result.overall.stress,
        overall_fluency: result.overall.fluency,
        band_estimate: result.overall.band,
        engine: result.engine,
      })
      .eq('id', attemptId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update attempt' });
    }

    await ctx.supabase.from('speaking_segments').delete().eq('attempt_id', attemptId);

    const segmentRows = [
      ...result.words.map((word) => ({
        attempt_id: attemptId,
        token_type: 'word' as const,
        token: word.text,
        start_ms: word.startMs,
        end_ms: word.endMs,
        accuracy: word.accuracy,
        stress_ok: word.stressOk ?? null,
        notes: word.notes ?? null,
      })),
      ...result.phonemes.map((phoneme) => ({
        attempt_id: attemptId,
        token_type: 'phoneme' as const,
        token: phoneme.symbol,
        start_ms: phoneme.startMs,
        end_ms: phoneme.endMs,
        accuracy: phoneme.accuracy,
        stress_ok: null,
        notes: null,
      })),
    ];

    if (segmentRows.length > 0) {
      const { error: insertSegmentsError } = await ctx.supabase.from('speaking_segments').insert(segmentRows);
      if (insertSegmentsError) {
        return res.status(500).json({ error: 'Failed to store segment feedback' });
      }
    }

    const phonemeAverages = new Map<string, { total: number; count: number }>();
    for (const phoneme of result.phonemes) {
      const key = phoneme.symbol;
      const bucket = phonemeAverages.get(key) ?? { total: 0, count: 0 };
      bucket.total += phoneme.accuracy;
      bucket.count += 1;
      phonemeAverages.set(key, bucket);
    }

    const nowIso = new Date().toISOString();
    const weakSet = new Set(result.weakIPA);
    const goalRows = Array.from(weakSet).map((ipa) => {
      const stat = phonemeAverages.get(ipa);
      return {
        user_id: ctx.user.id,
        ipa,
        current_accuracy: stat && stat.count > 0 ? Number((stat.total / stat.count).toFixed(3)) : null,
        last_practiced_at: nowIso,
      };
    });

    if (goalRows.length > 0) {
      const { error: upsertError } = await ctx.supabase
        .from('speaking_pron_goals')
        .upsert(goalRows, { onConflict: 'user_id,ipa' });

      if (upsertError) {
        return res.status(500).json({ error: 'Failed to update goals' });
      }
    }

    const payload: ScoreResponse = {
      attemptId,
      overall: result.overall,
      weakIPA: result.weakIPA,
      words: result.words,
      phonemes: result.phonemes,
    };

    return res.status(200).json(payload);
  },
  { allowRoles: ['teacher', 'admin'] },
);
