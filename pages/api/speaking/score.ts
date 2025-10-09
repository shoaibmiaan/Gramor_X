import { env } from '@/lib/env';
// pages/api/speaking/score.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';

type Breakdown = { fluency: number; lexical: number; grammar: number; pronunciation: number };

const AI_RETRY_COUNT = 1;
const AUDIO_FETCH_TIMEOUT_MS = 30_000;

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_RETRY_COUNT; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[speaking.score] ${label} failed (attempt ${attempt + 1})`, error);
      if (attempt < AI_RETRY_COUNT) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUDIO_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Audio fetch failed: ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Audio download timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  let plan: 'free' | 'starter' | 'booster' | 'master' = 'free';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership_plan')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.membership_plan) plan = profile.membership_plan as typeof plan;
  } catch (error) {
    console.warn('[speaking.score] failed to read plan', error);
  }

  // Verify ownership & load attempt
  const { data: attempt, error } = await supabaseAdmin
    .from('speaking_attempts')
    .select('id,user_id,audio_urls')
    .eq('id', attemptId)
    .single();

  if (error || !attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'ai_unavailable', message: 'Speaking scorer is not configured.' });
  }

  try {
    // ---- 1. Gather signed URLs for all audio ----
    const audioPaths: string[] = Object.values(attempt.audio_urls || {}).flat() as string[];
    const signedUrls: string[] = [];

    for (const path of audioPaths) {
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from('speaking-audio')
        .createSignedUrl(path, 300); // 5 min
      if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || 'Unable to sign URL');
      signedUrls.push(signed.signedUrl);
    }

    const scoringStartedAt = new Date();
    try {
      await trackor.log('speaking_attempt_scoring_started', {
        attempt_id: attemptId,
        user_id: user.id,
        plan,
        audio_clip_count: signedUrls.length,
        started_at: scoringStartedAt.toISOString(),
      });
    } catch (logErr) {
      console.warn('[speaking.score] analytics failed to log start', logErr);
    }

    // ---- 2. Transcribe all audio with Whisper ----
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    let fullTranscript = '';

    for (const audioUrl of signedUrls) {
      const audioResp = await fetchWithTimeout(audioUrl);
      const audioBuffer = Buffer.from(await audioResp.arrayBuffer());

      const transcription = await withRetry('transcription', () =>
        openai.audio.transcriptions.create({
          file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
          model: 'whisper-1',
          language: 'en',
        })
      );

      fullTranscript += transcription.text.trim() + '\n';
    }

    fullTranscript = fullTranscript.trim();
    if (!fullTranscript) {
      throw new Error('Transcript empty after processing audio');
    }

    // ---- 3. Score transcript with GPT ----
    const prompt = `
You are an IELTS Speaking examiner. Score the candidate based on the transcript below.
Provide:
- Overall band score (0-9, .5 increments)
- Four criteria: fluency, lexical resource, grammatical range & accuracy, pronunciation
- One short feedback paragraph

Transcript:
"""
${fullTranscript}
"""

Return JSON in this format:
{
  "bandOverall": number,
  "criteria": {
    "fluency": number,
    "lexical": number,
    "grammar": number,
    "pronunciation": number
  },
  "notes": "string"
}
`;

    const gptResp = await withRetry('scoring', () =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // fast + good for rubric scoring
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      })
    );

    const raw = gptResp.choices[0].message?.content || '{}';
    let scoring: { bandOverall: number; criteria: Breakdown; notes: string };
    try {
      scoring = JSON.parse(raw);
    } catch {
      throw new Error('Failed to parse GPT response: ' + raw);
    }

    // ---- 4. Update DB ----
    await supabaseAdmin
      .from('speaking_attempts')
      .update({
        transcript: fullTranscript,
        band_overall: scoring.bandOverall,
        band_breakdown: scoring.criteria,
      })
      .eq('id', attemptId);

    const finishedAt = new Date();
    try {
      await trackor.log('speaking_attempt_scored', {
        attempt_id: attemptId,
        user_id: user.id,
        plan,
        audio_clip_count: signedUrls.length,
        transcript_chars: fullTranscript.length,
        band_overall: scoring.bandOverall,
        band_breakdown: scoring.criteria,
        completed_at: finishedAt.toISOString(),
      });
    } catch (logErr) {
      console.warn('[speaking.score] analytics failed to log success', logErr);
    }

    return res.status(200).json({
      attemptId,
      transcript: fullTranscript,
      ...scoring,
    });
  } catch (err: any) {
    console.error(err);
    try {
      await trackor.log('speaking_attempt_score_failed', {
        attempt_id: attemptId,
        user_id: user.id,
        plan,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch (logErr) {
      console.warn('[speaking.score] analytics failed', logErr);
    }
    return res.status(502).json({
      error: 'ai_scoring_failed',
      message: 'We could not score your speaking attempt. Please try again shortly.',
    });
  }
}
