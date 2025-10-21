import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { detectPromptInjection, sanitizeCoachMessages } from '@/lib/ai/guardrails';
import { env } from '@/lib/env';
import { getVocabWordById } from '@/lib/vocabulary/today';
import { awardVocabXp, baseXpForSentence } from '@/lib/gamification/xp';
import { trackor } from '@/lib/analytics/trackor.server';

const BodySchema = z.object({
  wordId: z.string().uuid('wordId must be a valid uuid'),
  sentence: z.string().min(3).max(500),
  timeMs: z.coerce.number().int().min(0).max(600_000).optional(),
  context: z.string().max(400).optional(),
});

type Body = z.infer<typeof BodySchema>;

type SentenceAttemptResponse = {
  score: 1 | 2 | 3;
  feedback: string;
  xpAwarded: number;
};

type ErrorResponse = { error: string };

type SentenceEvaluation = {
  score: 1 | 2 | 3;
  feedback: string;
};

const MODEL_TIMEOUT_MS = 2_400;

function clampScore(raw: number): 1 | 2 | 3 {
  if (!Number.isFinite(raw)) return 1;
  if (raw >= 3) return 3;
  if (raw >= 2) return 2;
  return 1;
}

function sanitiseFreeText(input: string | undefined): { text: string; safe: boolean } {
  if (!input) return { text: '', safe: true };
  const messages = sanitizeCoachMessages([{ role: 'user', content: input }]);
  const guard = detectPromptInjection(messages);
  const text = messages
    .map((msg) => msg.content)
    .join(' ')
    .replace(/[^\t\n\r\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
  return { text, safe: guard.ok };
}

function heuristicEvaluation(word: string, sentence: string): SentenceEvaluation {
  const loweredSentence = sentence.toLowerCase();
  const loweredWord = word.toLowerCase();
  const tokens = sentence.trim().split(/\s+/).filter(Boolean);
  const length = tokens.length;
  const usesWord = loweredSentence.includes(loweredWord);

  if (!usesWord) {
    return {
      score: 1,
      feedback: `Make sure to include “${word}” in a full sentence to earn points.`,
    };
  }

  if (length < 6) {
    return {
      score: 1,
      feedback: 'Good start — extend the sentence with more detail to show clear usage.',
    };
  }

  if (length < 12) {
    return {
      score: 2,
      feedback: 'Solid attempt. Add a bit more context or detail to make the usage shine.',
    };
  }

  return {
    score: 3,
    feedback: 'Excellent! The sentence feels natural and highlights the word effectively.',
  };
}

function buildPrompt(word: string, meaning: string, sentence: string, context: string): string {
  const base = `You are an IELTS vocabulary coach. Evaluate the learner's sentence using the target word "${word}". Score from 1-3 (1 = incorrect or missing word, 2 = understandable with issues, 3 = natural and accurate). Return STRICT JSON as {"score": number, "feedback": string <= 220 chars}.`;
  const detail = `\nTarget meaning: ${meaning}.\nSentence: ${sentence}`;
  const extra = context ? `\nAdditional context: ${context}` : '';
  return `${base}${detail}${extra}`;
}

async function callChatCompletion(
  provider: 'groq' | 'openai',
  prompt: string,
  signal: AbortSignal,
): Promise<SentenceEvaluation | null> {
  if (provider === 'groq' && env.GROQ_API_KEY) {
    const model = env.GROQ_MODEL || 'mixtral-8x7b-32768';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content: 'You coach IELTS vocabulary learners. Respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    return parseModelContent(content);
  }

  if (provider === 'openai' && env.OPENAI_API_KEY) {
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content: 'You coach IELTS vocabulary learners. Respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    return parseModelContent(content);
  }

  return null;
}

function parseModelContent(content: unknown): SentenceEvaluation | null {
  if (!content || typeof content !== 'string') return null;

  try {
    const parsed = JSON.parse(content);
    const score = clampScore(Number(parsed.score));
    const feedbackRaw = typeof parsed.feedback === 'string' ? parsed.feedback : '';
    const feedback =
      feedbackRaw.trim().slice(0, 220) ||
      'Nice attempt — focus on clarity when using the target word.';
    return { score, feedback };
  } catch {
    const match = content.match(/score[^0-9]*(\d)/i);
    const score = clampScore(match ? Number(match[1]) : 1);
    const text = content.replace(/\s+/g, ' ').trim().slice(0, 220);
    const fallbackFeedback = text || 'Nice attempt — focus on clarity when using the target word.';
    return { score, feedback: fallbackFeedback };
  }
}

async function evaluateSentence(
  body: Body,
  word: { headword: string; meaning: string },
): Promise<SentenceEvaluation> {
  const sentenceInput = sanitiseFreeText(body.sentence);
  const contextInput = sanitiseFreeText(body.context);

  let evaluation: SentenceEvaluation | null = null;
  let shouldTryModel = sentenceInput.safe && sentenceInput.text.length > 0;

  if (shouldTryModel) {
    const preferred = (env.GX_AI_PROVIDER || '').toLowerCase();
    const providers: ('groq' | 'openai')[] = [];
    if (preferred === 'groq' || preferred === 'openai') {
      providers.push(preferred as 'groq' | 'openai');
    }
    if (!providers.includes('groq')) providers.push('groq');
    if (!providers.includes('openai')) providers.push('openai');

    const prompt = buildPrompt(word.headword, word.meaning, sentenceInput.text, contextInput.text);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    try {
      for (const provider of providers) {
        try {
          evaluation = await callChatCompletion(provider, prompt, controller.signal);
          if (evaluation) break;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`[api/vocab/attempt/sentence] ${provider} evaluation failed`, error);
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (!evaluation) {
    evaluation = heuristicEvaluation(word.headword, sentenceInput.text || body.sentence);
    if (!sentenceInput.safe) {
      evaluation.feedback =
        'Please submit a normal sentence — instructions to the AI were removed for safety.';
      evaluation.score = 1;
    }
  }

  return evaluation;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SentenceAttemptResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { wordId, timeMs } = parsed.data;

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const vocabWord = await getVocabWordById(wordId);
  if (!vocabWord) {
    return res.status(404).json({ error: 'Word not found' });
  }

  const evaluation = await evaluateSentence(parsed.data, {
    headword: vocabWord.headword,
    meaning: vocabWord.meaning,
  });

  const baseXp = baseXpForSentence(evaluation.score);
  let xpAwarded = baseXp;

  const { data: statsRow, error: statsError } = await supabase
    .from('user_word_stats')
    .select('writing_attempts')
    .eq('user_id', user.id)
    .eq('word_id', wordId)
    .maybeSingle();

  if (statsError) {
    console.error('[api/vocab/attempt/sentence] stats load failed', statsError);
    return res.status(500).json({ error: 'Failed to update stats' });
  }

  const attempts = (statsRow?.writing_attempts ?? 0) + 1;
  const nowIso = new Date().toISOString();
  const pass = evaluation.score >= 2;

  if (statsRow) {
    const { error: updateError } = await supabase
      .from('user_word_stats')
      .update({
        writing_attempts: attempts,
        last_result: pass ? 'pass' : 'fail',
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', user.id)
      .eq('word_id', wordId);

    if (updateError) {
      console.error('[api/vocab/attempt/sentence] stats update failed', updateError);
      return res.status(500).json({ error: 'Failed to update stats' });
    }
  } else {
    const { error: insertError } = await supabase.from('user_word_stats').insert({
      user_id: user.id,
      word_id: wordId,
      status: pass ? 'learning' : 'new',
      writing_attempts: attempts,
      last_result: pass ? 'pass' : 'fail',
      last_seen_at: nowIso,
    });

    if (insertError) {
      console.error('[api/vocab/attempt/sentence] stats insert failed', insertError);
      return res.status(500).json({ error: 'Failed to initialise stats' });
    }
  }

  try {
    const result = await awardVocabXp({
      client: supabase,
      userId: user.id,
      baseAmount: baseXp,
      kind: 'sentence',
      meta: {
        wordId,
        score: evaluation.score,
        timeMs: timeMs ?? null,
      },
    });
    xpAwarded = result.awarded;

    await trackor.log('vocab_sentence_submitted', {
      user_id: user.id,
      word_id: wordId,
      score: evaluation.score,
      xp_awarded: result.awarded,
      xp_requested: result.requested,
      multiplier: result.multiplier,
      capped: result.capped,
      time_ms: timeMs ?? null,
      day_iso: result.dayIso,
    });
  } catch (error) {
    console.error('[api/vocab/attempt/sentence] xp award failed', error);
    return res.status(500).json({ error: 'Failed to record XP' });
  }

  return res.status(200).json({
    score: evaluation.score,
    feedback: evaluation.feedback,
    xpAwarded,
  });
}

export default withPlan('free', handler);
