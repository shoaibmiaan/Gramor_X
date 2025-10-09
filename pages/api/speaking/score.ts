// pages/api/speaking/score.ts
import { env } from '@/lib/env';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { z } from 'zod';

type Breakdown = {
  fluency: number;
  coherence: number;
  lexical: number;
  pronunciation: number;
  grammar?: number;
};

const isHalfBand = (val: number) => Math.abs(val * 2 - Math.round(val * 2)) < 1e-8;

const bandScoreSchema = z
  .number({ required_error: 'Missing score' })
  .min(0)
  .max(9)
  .refine(isHalfBand, 'Scores must use 0.5 band increments');

const scoringSchema = z.object({
  bandOverall: bandScoreSchema,
  criteria: z.object({
    fluency: bandScoreSchema,
    coherence: bandScoreSchema,
    lexical: bandScoreSchema,
    pronunciation: bandScoreSchema,
  }),
  feedback: z.string().min(3, 'Feedback required'),
});

const coerceScore = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(numeric)) return numeric;
  }
  return value;
};

const normalizeScoringPayload = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid scoring payload');
  }

  const obj = raw as Record<string, unknown>;
  const criteriaSource = (obj.criteria || obj.breakdown || obj.scores || obj.band_breakdown) as
    | Record<string, unknown>
    | undefined;

  const normalized = {
    bandOverall: coerceScore(obj.bandOverall ?? obj.band_overall ?? obj.overall ?? obj.band),
    criteria: {
      fluency: coerceScore(
        criteriaSource?.fluency ??
          criteriaSource?.fluency_coherence ??
          criteriaSource?.fluencyAndCoherence ??
          criteriaSource?.fluency_and_coherence,
      ),
      coherence: coerceScore(
        criteriaSource?.coherence ??
          criteriaSource?.organization ??
          criteriaSource?.structure ??
          criteriaSource?.fluency_coherence ??
          criteriaSource?.fluencyAndCoherence ??
          criteriaSource?.fluency_and_coherence,
      ),
      lexical: coerceScore(
        criteriaSource?.lexical ??
          criteriaSource?.lexical_resource ??
          criteriaSource?.lexicalResource ??
          criteriaSource?.vocabulary,
      ),
      pronunciation: coerceScore(criteriaSource?.pronunciation),
    },
    feedback: obj.feedback ?? obj.notes ?? obj.summary ?? obj.comment,
  };

  return scoringSchema.parse(normalized);
};

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { attemptId } = req.body as { attemptId: string };
  if (!attemptId) return res.status(400).json({ error: 'Missing attemptId' });

  const supabase = createSupabaseServerClient({ req });

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Verify ownership & load attempt
  const { data: attempt, error } = await supabaseAdmin
    .from('speaking_attempts')
    .select('id,user_id,audio_urls')
    .eq('id', attemptId)
    .single();

  if (error || !attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  try {
    if (!env.OPENAI_API_KEY) throw new Error('Missing OpenAI API key');

    // ---- 1. Gather signed URLs for all audio ----
    const audioMap = (attempt.audio_urls as Record<string, unknown> | null) ?? {};
    const sectionPriority: Record<string, number> = {
      p1: 0,
      p2: 1,
      p3: 2,
      chat: 3,
      roleplay: 4,
    };

    const audioPaths: string[] = [];
    Object.entries(audioMap)
      .sort(([a], [b]) => {
        const pa = sectionPriority[a] ?? 99;
        const pb = sectionPriority[b] ?? 99;
        return pa - pb || a.localeCompare(b);
      })
      .forEach(([, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' && item.trim()) audioPaths.push(item);
          });
        } else if (typeof value === 'string' && value.trim()) {
          audioPaths.push(value);
        }
      });

    if (!audioPaths.length) {
      return res.status(400).json({ error: 'No audio clips found for this attempt' });
    }

    const signedUrls: string[] = [];
    for (const path of audioPaths) {
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from('speaking-audio')
        .createSignedUrl(path, 300); // 5 min
      if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || 'Unable to sign URL');
      signedUrls.push(signed.signedUrl);
    }

    // ---- 2. Transcribe all audio with Whisper ----
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    let fullTranscript = '';

    for (const audioUrl of signedUrls) {
      const audioResp = await fetch(audioUrl);
      const audioBuffer = Buffer.from(await audioResp.arrayBuffer());

      const transcription = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
        model: 'whisper-1',
        language: 'en',
      });

      fullTranscript += transcription.text.trim() + '\n';
    }

    fullTranscript = fullTranscript.trim();

    if (!fullTranscript) {
      throw new Error('Transcript could not be generated from the audio files');
    }

    // ---- 3. Score transcript with GPT ----
    const prompt = `
You are an IELTS Speaking examiner. Score the candidate based on the transcript below.
Return JSON with:
- "bandOverall": number (0-9, 0.5 increments)
- "criteria": { fluency, coherence, lexical, pronunciation }
- "feedback": short paragraph (2-3 sentences)

Transcript:
"""
${fullTranscript}
"""`;

    const gptResp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const raw = gptResp.choices[0].message?.content || '{}';
    let parsed: { bandOverall: number; criteria: Breakdown; feedback: string };
    try {
      const json = JSON.parse(raw);
      parsed = normalizeScoringPayload(json);
    } catch (error) {
      console.error('GPT scoring parse failure', raw);
      if (error instanceof Error) throw error;
      throw new Error('Unable to parse scoring response');
    }

    const breakdown: Breakdown = {
      fluency: parsed.criteria.fluency,
      coherence: parsed.criteria.coherence,
      lexical: parsed.criteria.lexical,
      pronunciation: parsed.criteria.pronunciation,
      grammar: undefined,
    };

    // ---- 4. Update DB ----
    await supabaseAdmin
      .from('speaking_attempts')
      .update({
        transcript: fullTranscript,
        band_overall: parsed.bandOverall,
        band_breakdown: breakdown,
        status: 'completed',
      })
      .eq('id', attemptId);

    const { error: responseErr } = await supabaseAdmin
      .from('speaking_responses')
      .upsert(
        {
          attempt_id: attemptId,
          transcript: fullTranscript,
          band_overall: parsed.bandOverall,
          band_breakdown: breakdown,
          feedback: parsed.feedback,
        },
        { onConflict: 'attempt_id' },
      );

    if (responseErr) throw new Error(responseErr.message);

    return res.status(200).json({
      attemptId,
      transcript: fullTranscript,
      bandOverall: parsed.bandOverall,
      criteria: breakdown,
      feedback: parsed.feedback,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
