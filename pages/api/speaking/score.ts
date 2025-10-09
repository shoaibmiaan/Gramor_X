import { env } from '@/lib/env';
// pages/api/speaking/score.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';

type Breakdown = { fluency: number; lexical: number; grammar: number; pronunciation: number };

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 750;
const AUDIO_FETCH_TIMEOUT_MS = 45_000;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown = new Error('Unknown error');
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[speaking.score] ${label} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const normalizeScore = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function fetchWithTimeout(url: string, timeoutMs = AUDIO_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch audio (${response.status})`);
    return response;
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

  // Verify ownership & load attempt
  const { data: attempt, error } = await supabaseAdmin
    .from('speaking_attempts')
    .select('id,user_id,audio_urls')
    .eq('id', attemptId)
    .single();

  if (error || !attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  const audioPaths: string[] = Object.values(attempt.audio_urls || {}).flat() as string[];
  if (audioPaths.length === 0) {
    await trackor.log('speaking_attempt_scoring_failed', {
      attempt_id: attemptId,
      user_id: user.id,
      stage: 'no_audio',
      error: 'No audio attached to attempt',
    });
    return res.status(400).json({ error: 'no_audio', message: 'No audio was found for this attempt.' });
  }

  if (!env.OPENAI_API_KEY) {
    await trackor.log('speaking_attempt_scoring_failed', {
      attempt_id: attemptId,
      user_id: user.id,
      stage: 'config',
      error: 'OPENAI_API_KEY missing',
    });
    return res.status(503).json({ error: 'service_unavailable', message: 'Speaking scoring is temporarily unavailable.' });
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  let stage = 'init';
  let fullTranscript = '';

  await trackor.log('speaking_attempt_scoring_started', {
    attempt_id: attemptId,
    user_id: user.id,
    audio_segments: audioPaths.length,
  });

  try {
    // ---- 1. Gather signed URLs for all audio ----
    stage = 'sign_urls';
    const signedUrls: string[] = [];

    for (const path of audioPaths) {
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from('speaking-audio')
        .createSignedUrl(path, 300); // 5 min
      if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || 'Unable to sign URL');
      signedUrls.push(signed.signedUrl);
    }

    // ---- 2. Transcribe all audio with Whisper ----
    stage = 'transcribe';
    for (let i = 0; i < signedUrls.length; i += 1) {
      const audioUrl = signedUrls[i];
      stage = `fetch_audio_${i}`;
      const audioResp = await fetchWithTimeout(audioUrl);
      const audioBuffer = Buffer.from(await audioResp.arrayBuffer());

      stage = `transcribe_${i}`;
      const transcription = await withRetry(
        () =>
          openai.audio.transcriptions.create({
            file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
            model: 'whisper-1',
            language: 'en',
          }),
        stage
      );

      const text = transcription.text?.trim();
      if (text) fullTranscript += text + '\n';
    }

    fullTranscript = fullTranscript.trim();

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

    stage = 'score';
    const gptResp = await withRetry(
      () =>
        openai.chat.completions.create({
          model: 'gpt-4o-mini', // fast + good for rubric scoring
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
        }),
      stage
    );

    const raw = gptResp.choices[0].message?.content || '{}';
    let scoring: { bandOverall: number; criteria: Breakdown; notes: string };
    try {
      scoring = JSON.parse(raw);
    } catch {
      throw new Error('Failed to parse GPT response: ' + raw);
    }

    if (!scoring || typeof scoring.bandOverall !== 'number' || typeof scoring.notes !== 'string' || !scoring.criteria) {
      throw new Error('Incomplete scoring payload');
    }

    const normalizedCriteria: Breakdown = {
      fluency: normalizeScore((scoring.criteria as Partial<Breakdown>).fluency),
      lexical: normalizeScore((scoring.criteria as Partial<Breakdown>).lexical),
      grammar: normalizeScore((scoring.criteria as Partial<Breakdown>).grammar),
      pronunciation: normalizeScore((scoring.criteria as Partial<Breakdown>).pronunciation),
    };

    // ---- 4. Update DB ----
    stage = 'persist';
    await supabaseAdmin
      .from('speaking_attempts')
      .update({
        transcript: fullTranscript,
        band_overall: scoring.bandOverall,
        band_breakdown: normalizedCriteria,
      })
      .eq('id', attemptId);

    await trackor.log('speaking_attempt_scoring_completed', {
      attempt_id: attemptId,
      user_id: user.id,
      band_overall: scoring.bandOverall,
      transcript_length: fullTranscript.length,
      audio_segments: audioPaths.length,
    });

    return res.status(200).json({
      attemptId,
      transcript: fullTranscript,
      bandOverall: scoring.bandOverall,
      criteria: normalizedCriteria,
      notes: scoring.notes,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await trackor.log('speaking_attempt_scoring_failed', {
      attempt_id: attemptId,
      user_id: user.id,
      stage,
      error: message,
    });
    console.error(err);
    return res.status(502).json({
      error: 'speaking_scoring_failed',
      message: 'We could not score your attempt. Please try again shortly.',
    });
  }
}
