import { env } from '@/lib/env';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';
import { z } from 'zod';

const AI_RETRY_COUNT = 1;
const AUDIO_FETCH_TIMEOUT_MS = 30_000;
const SPEAKING_BUCKET = env.SPEAKING_BUCKET || 'speaking';

const ScoreSchema = z.object({
  bandOverall: z.number(),
  criteria: z.object({
    fluency: z.number(),
    lexical: z.number(),
    grammar: z.number(),
    pronunciation: z.number(),
  }),
  notes: z.string(),
});

type Breakdown = {
  fluency: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
};

type ScoreResponse = {
  attemptId: string;
  transcript: string;
  bandOverall: number;
  criteria: Breakdown;
  notes: string;
};

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

function normalizeAudioPaths(input: unknown): string[] {
  const paths = new Set<string>();

  const visit = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) paths.add(trimmed);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };

  visit(input);
  return Array.from(paths);
}

function normalizeScore(value: unknown): number {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number.parseFloat(value)
      : Number.NaN;
  if (!Number.isFinite(num)) return 0;
  const clamped = Math.min(9, Math.max(0, num));
  return Math.round(clamped * 2) / 2;
}

function guessMimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (!ext) return 'audio/webm';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'm4a') return 'audio/mp4';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  return 'audio/webm';
}

function parseScorePayload(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const snippet = trimmed.slice(start, end + 1);
      return JSON.parse(snippet);
    }
    throw new Error('Failed to parse GPT response: ' + trimmed);
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScoreResponse | { error: string; message?: string }>,
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { attemptId } = req.body as { attemptId?: string };
  if (!attemptId) return res.status(400).json({ error: 'Missing attemptId' });

  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'ai_unavailable',
      message: 'Speaking scorer is not configured.',
    });
  }

  let stage: 'sign_urls' | 'transcribe' | 'score' | 'persist' = 'sign_urls';

  try {
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('speaking_attempts')
      .select('id,user_id,audio_object_path,audio_urls,status')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const audioPaths = normalizeAudioPaths([attempt.audio_object_path, attempt.audio_urls]);
    if (audioPaths.length === 0) {
      return res.status(400).json({
        error: 'no_audio',
        message: 'Record an answer before requesting a score.',
      });
    }

    stage = 'sign_urls';
    const signedUrls: string[] = [];
    for (const path of audioPaths) {
      const { data: signed, error: signedErr } = await supabaseAdmin.storage
        .from(SPEAKING_BUCKET)
        .createSignedUrl(path, 60 * 5);
      if (signedErr || !signed?.signedUrl) {
        throw new Error(signedErr?.message || 'Unable to sign audio URL');
      }
      signedUrls.push(signed.signedUrl);
    }

    try {
      const scoringStartedAt = new Date();
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

    stage = 'transcribe';
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    let fullTranscript = '';

    for (let idx = 0; idx < signedUrls.length; idx += 1) {
      const audioUrl = signedUrls[idx];
      const originalPath = audioPaths[idx] ?? `clip-${idx + 1}.webm`;
      const audioResp = await fetchWithTimeout(audioUrl);
      const audioBuffer = await audioResp.arrayBuffer();
      const fileName = originalPath.split('/').pop() || `clip-${idx + 1}.webm`;
      const file = new File([audioBuffer], fileName, { type: guessMimeFromPath(fileName) });

      const transcription = await withRetry('transcription', () =>
        openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language: 'en',
        }),
      );

      const text = transcription.text?.trim();
      if (text) fullTranscript += text + '\n';
    }

    fullTranscript = fullTranscript.trim();
    if (!fullTranscript) {
      throw new Error('Transcript empty after processing audio');
    }

    stage = 'score';
    const scoringPrompt = `You are an IELTS Speaking examiner. Score the candidate based on the transcript below.
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
}`;

    const chatModel = env.OPENAI_MODEL || 'gpt-4o-mini';
    const gptResp = await withRetry('scoring', () =>
      openai.chat.completions.create({
        model: chatModel,
        messages: [{ role: 'user', content: scoringPrompt }],
        temperature: 0,
      }),
    );

    const raw = gptResp.choices[0]?.message?.content || '{}';
    const parsed = parseScorePayload(raw);
    const validated = ScoreSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error('Failed to validate scoring payload');
    }

    const normalizedCriteria: Breakdown = {
      fluency: normalizeScore(validated.data.criteria.fluency),
      lexical: normalizeScore(validated.data.criteria.lexical),
      grammar: normalizeScore(validated.data.criteria.grammar),
      pronunciation: normalizeScore(validated.data.criteria.pronunciation),
    };
    const overallBand = normalizeScore(validated.data.bandOverall);

    stage = 'persist';
    await supabaseAdmin
      .from('speaking_attempts')
      .update({
        transcript: fullTranscript,
        band_overall: overallBand,
        band_breakdown: normalizedCriteria,
        status: 'completed',
      })
      .eq('id', attemptId);

    await supabaseAdmin
      .from('speaking_responses')
      .delete()
      .eq('attempt_id', attemptId)
      .eq('evaluator', 'ai');

    await supabaseAdmin.from('speaking_responses').insert({
      attempt_id: attemptId,
      evaluator: 'ai',
      overall: overallBand,
      fluency: normalizedCriteria.fluency,
      lexical: normalizedCriteria.lexical,
      grammar: normalizedCriteria.grammar,
      pronunciation: normalizedCriteria.pronunciation,
      feedback: validated.data.notes.trim(),
      raw: {
        bandOverall: validated.data.bandOverall,
        criteria: validated.data.criteria,
        notes: validated.data.notes,
        transcript: fullTranscript,
      },
    });

    const finishedAt = new Date();
    try {
      await trackor.log('speaking_attempt_scored', {
        attempt_id: attemptId,
        user_id: user.id,
        plan,
        audio_clip_count: signedUrls.length,
        transcript_chars: fullTranscript.length,
        band_overall: overallBand,
        band_breakdown: normalizedCriteria,
        completed_at: finishedAt.toISOString(),
      });
    } catch (logErr) {
      console.warn('[speaking.score] analytics failed to log success', logErr);
    }

    const response: ScoreResponse = {
      attemptId,
      transcript: fullTranscript,
      bandOverall: overallBand,
      criteria: normalizedCriteria,
      notes: validated.data.notes.trim(),
    };

    return res.status(200).json(response);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    try {
      await trackor.log('speaking_attempt_scoring_failed', {
        attempt_id: attemptId,
        user_id: user?.id ?? null,
        stage,
        plan,
        error: message,
      });
    } catch (logErr) {
      console.warn('[speaking.score] analytics failed', logErr);
    }

    try {
      await trackor.log('speaking_attempt_score_failed', {
        attempt_id: attemptId,
        user_id: user?.id ?? null,
        plan,
        error: message,
      });
    } catch (logErr) {
      console.warn('[speaking.score] analytics failed (score_failed)', logErr);
    }

    console.error('[speaking.score] failed', err);
    return res.status(502).json({
      error: 'ai_scoring_failed',
      message: 'We could not score your speaking attempt. Please try again shortly.',
    });
  }
}
