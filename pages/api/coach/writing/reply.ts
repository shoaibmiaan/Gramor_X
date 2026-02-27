import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';

import {
  buildAttemptContextBlock,
  deserializeConversationState,
  loadWritingAttemptContext,
  normalizeCoachMessage,
  serializeConversationState,
} from '@/lib/coach/writing-context';
import { detectPromptInjection, sanitizeCoachMessages } from '@/lib/ai/guardrails';
import { track } from '@/lib/analytics/track';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingCoachAttemptState } from '@/types/coach';

const SYSTEM_PROMPT = `You are GramorX's IELTS Writing coach. Offer precise, encouraging guidance.
Focus on:
- Highlighting concrete strengths and weaknesses grounded in IELTS band descriptors.
- Suggesting 1-2 actionable revisions the learner can apply immediately.
- Keeping responses under 180 words unless explicitly asked for more.
- Never fabricate scores; only reference bands present in the supplied context.`;

const MAX_HISTORY = 12;

type SessionRow = {
  id: string;
  user_id: string;
  attempt_id?: string | null;
  conversation?: unknown;
  messages?: unknown;
  attempt_snapshot?: WritingCoachAttemptState | null;
};

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
  stream: z.boolean().optional().default(true),
});

const table = (client: SupabaseClient<any>) => client.from('coach_writing_sessions');

function buildFallbackReply(attempt: WritingCoachAttemptState | null): string {
  if (attempt && attempt.tasks.length > 0) {
    const latest = attempt.tasks[attempt.tasks.length - 1];
    const promptTitle = latest.prompt?.title ?? latest.task.toUpperCase();
    const bandText =
      typeof latest.overallBand === 'number'
        ? `Your latest band was ${latest.overallBand}.`
        : 'Aim to align with band descriptors for structure, coherence, lexis, and grammar.';
    const wordCount =
      typeof latest.wordCount === 'number' ? `You wrote ${latest.wordCount} words.` : 'Target the recommended word count.';
    return [
      'AI feedback is momentarily unavailable, so here is a quick checkpoint:',
      `${bandText} ${wordCount}`,
      'Review your thesis/topic sentences to ensure each body paragraph develops a single clear idea.',
      'Add specific evidence or comparisons and revise complex sentences to remove ambiguity.',
      `Prompt reference: ${promptTitle}.`,
    ].join(' ');
  }

  return [
    'AI feedback is warming up. Meanwhile, revisit the IELTS band descriptors for Task Response, Cohesion, Lexical Resource,',
    'and Grammar. Outline your introduction, topic sentences, supporting evidence, and conclusion before drafting. Maintain',
    'academic tone, vary linking devices, and proofread for agreement/punctuation issues.',
  ].join(' ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!flags.enabled('coach')) {
    res.status(404).json({ error: 'coach_disabled' });
    return;
  }

  const bodyParse = BodySchema.safeParse(req.body ?? {});
  if (!bodyParse.success) {
    res.status(400).json({ error: 'invalid_request', details: bodyParse.error.flatten() });
    return;
  }

  const { sessionId, message } = bodyParse.data;

  const supabase = getServerClient(req, res);
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session?.user) {
    res.status(401).json({ error: 'auth_required', details: authError?.message });
    return;
  }

  const userId = session.user.id;

  try {
    const { data: row, error: sessionError } = await table(supabase)
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }
    if (!row) {
      res.status(404).json({ error: 'session_not_found' });
      return;
    }

    const sessionRow = row as SessionRow;
    const conversation = deserializeConversationState(sessionRow.conversation ?? sessionRow.messages ?? null);

    const sanitizedMessage = sanitizeCoachMessages([{ role: 'user', content: message }]);
    if (!sanitizedMessage.length) {
      res.status(400).json({ error: 'invalid_message' });
      return;
    }

    const guard = detectPromptInjection([
      ...conversation.messages.map((msg) => ({ role: msg.role, content: msg.content })),
      sanitizedMessage[0],
    ]);
    if (!guard.ok) {
      res.status(400).json({ error: guard.reason });
      return;
    }

    const normalizedUserMessage = normalizeCoachMessage({
      role: 'user',
      content: sanitizedMessage[0].content,
      createdAt: new Date().toISOString(),
    });
    if (!normalizedUserMessage) {
      res.status(400).json({ error: 'invalid_message' });
      return;
    }

    const history = [...conversation.messages, normalizedUserMessage];
    const trimmedHistory = history.slice(-MAX_HISTORY);

    let attempt: WritingCoachAttemptState | null =
      (sessionRow.attempt_snapshot as WritingCoachAttemptState | null) ?? null;
    if (!attempt && sessionRow.attempt_id) {
      try {
        attempt = await loadWritingAttemptContext(supabase, userId, sessionRow.attempt_id);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[coach.writing.reply] attempt load failed', error);
      }
    }

    const contextBlock = buildAttemptContextBlock(attempt ?? null);

    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextBlock },
      ...trimmedHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const openaiApiKey = env.OPENAI_API_KEY?.trim();
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const client = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

    track('coach.writing.reply', {
      sessionId,
      attemptId: sessionRow.attempt_id ?? undefined,
      provider: client ? 'openai' : 'fallback',
    });

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let assistantText = '';

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: openaiMessages,
          temperature: 0.6,
          stream: true,
        });

        for await (const chunk of completion) {
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) {
            assistantText += text;
            res.write(text);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[coach.writing.reply] completion failed', error);
        if (!assistantText) {
          assistantText = 'We hit a snag generating feedback. Please try again in a moment.';
        }
        if (!res.writableEnded) {
          res.write(assistantText);
        }
      }
    } else {
      assistantText = buildFallbackReply(attempt ?? null);
      res.write(assistantText);
    }

    if (!res.writableEnded) {
      res.end();
    }

    const nextMessages = [...conversation.messages, normalizedUserMessage];
    if (assistantText.trim()) {
      const assistantMessage = normalizeCoachMessage({
        role: 'assistant',
        content: assistantText.trim(),
        createdAt: new Date().toISOString(),
      });
      if (assistantMessage) {
        nextMessages.push(assistantMessage);
      }
    }

    const nextState = serializeConversationState({ messages: nextMessages, summary: conversation.summary ?? null });

    try {
      await table(supabase)
        .update({
          conversation: nextState,
          summary: nextState.summary ?? null,
          attempt_snapshot: attempt ?? null,
        })
        .eq('id', sessionId)
        .eq('user_id', userId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[coach.writing.reply] failed to persist conversation', error);
    }

    return;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[coach.writing.reply] unexpected failure', error);
    res.status(500).json({ error: 'reply_failed' });
  }
}

