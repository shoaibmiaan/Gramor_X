import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { loadWritingAttemptContext, deserializeConversationState, serializeConversationState } from '@/lib/coach/writing-context';
import { track } from '@/lib/analytics/track';
import { flags } from '@/lib/flags';
import { redis } from '@/lib/redis';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingCoachAttemptState, WritingCoachSession, WritingCoachSessionResult } from '@/types/coach';

const SESSION_CREATE_LIMIT = 16;
const SESSION_WINDOW_SECONDS = 60 * 60 * 24;

type SessionRow = {
  id: string;
  user_id: string;
  attempt_id?: string | null;
  conversation?: unknown;
  messages?: unknown;
  summary?: string | null;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
  attempt_snapshot?: WritingCoachAttemptState | null;
};

const QuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
});

const BodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
});

const table = (client: SupabaseClient<any>) => client.from('coach_writing_sessions');

function mapRow(row: SessionRow, attempt: WritingCoachAttemptState | null): WritingCoachSession {
  const conv = deserializeConversationState(row.conversation ?? row.messages ?? null);
  const summary =
    conv.summary ?? (typeof row.summary === 'string' ? row.summary : row.summary === null ? null : undefined);

  return {
    id: row.id,
    userId: row.user_id,
    attemptId: row.attempt_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    messages: conv.messages,
    summary: summary ?? null,
    attempt,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

async function getSessionById(client: SupabaseClient<Database>, userId: string, sessionId: string) {
  const { data, error } = await table(client)
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as SessionRow | null;
}

async function getSessionByAttempt(client: SupabaseClient<Database>, userId: string, attemptId: string) {
  const { data, error } = await table(client)
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as SessionRow | null;
}

async function ensureSessionQuota(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `coach:writing:sessions:${userId}:${today}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, SESSION_WINDOW_SECONDS);
  }
  if (count > SESSION_CREATE_LIMIT) {
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<WritingCoachSessionResult | { error: string; details?: unknown }>) {
  if (!flags.enabled('coach')) {
    res.status(404).json({ error: 'coach_disabled' });
    return;
  }

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

  if (req.method === 'GET') {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }

    const { sessionId, attemptId } = parsed.data;
    if (!sessionId && !attemptId) {
      res.status(400).json({ error: 'missing_identifier' });
      return;
    }

    try {
      let row: SessionRow | null = null;
      if (sessionId) {
        row = await getSessionById(supabase, userId, sessionId);
      }
      if (!row && attemptId) {
        row = await getSessionByAttempt(supabase, userId, attemptId);
      }
      if (!row) {
        res.status(404).json({ error: 'session_not_found' });
        return;
      }

      let attempt: WritingCoachAttemptState | null = (row.attempt_snapshot as WritingCoachAttemptState | null) ?? null;
      if (!attempt && row.attempt_id) {
        try {
          attempt = await loadWritingAttemptContext(supabase, userId, row.attempt_id);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[coach.writing.session] attempt load failed', error);
          res.status(500).json({ error: 'attempt_load_failed' });
          return;
        }
      }

      res.status(200).json({ ok: true, session: mapRow(row, attempt ?? null) });
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[coach.writing.session] fetch failed', error);
      res.status(500).json({ error: 'session_fetch_failed' });
      return;
    }
  }

  if (req.method === 'POST') {
    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }

    const { sessionId, attemptId } = parsed.data;

    try {
      if (sessionId) {
        const existing = await getSessionById(supabase, userId, sessionId);
        if (existing) {
          const attempt =
            (existing.attempt_snapshot as WritingCoachAttemptState | null) ??
            (existing.attempt_id
              ? await loadWritingAttemptContext(supabase, userId, existing.attempt_id).catch(() => null)
              : null);
          res.status(200).json({ ok: true, session: mapRow(existing, attempt ?? null) });
          return;
        }
      }

      if (attemptId) {
        const existing = await getSessionByAttempt(supabase, userId, attemptId);
        if (existing) {
          const attempt =
            (existing.attempt_snapshot as WritingCoachAttemptState | null) ??
            (existing.attempt_id
              ? await loadWritingAttemptContext(supabase, userId, existing.attempt_id).catch(() => null)
              : null);
          res.status(200).json({ ok: true, session: mapRow(existing, attempt ?? null) });
          return;
        }
      }

      const allowed = await ensureSessionQuota(userId);
      if (!allowed) {
        res.status(429).json({ error: 'session_limit_reached' });
        return;
      }

      let attempt: WritingCoachAttemptState | null = null;
      if (attemptId) {
        attempt = await loadWritingAttemptContext(supabase, userId, attemptId);
        if (!attempt) {
          res.status(404).json({ error: 'attempt_not_found' });
          return;
        }
      }

      const conversation = serializeConversationState({ messages: [], summary: null });

      const { data: inserted, error: insertError } = await table(supabase)
        .insert({
          user_id: userId,
          attempt_id: attemptId ?? null,
          conversation,
          summary: conversation.summary ?? null,
          attempt_snapshot: attempt ?? null,
        })
        .select('*')
        .single();

      if (insertError) {
        if ((insertError as any)?.code === '23505' && attemptId) {
          const existing = await getSessionByAttempt(supabase, userId, attemptId);
          if (existing) {
            const fallback =
              (existing.attempt_snapshot as WritingCoachAttemptState | null) ??
              (existing.attempt_id
                ? await loadWritingAttemptContext(supabase, userId, existing.attempt_id).catch(() => null)
                : null);
            res.status(200).json({ ok: true, session: mapRow(existing, fallback ?? null) });
            return;
          }
        }
        // eslint-disable-next-line no-console
        console.error('[coach.writing.session] insert failed', insertError);
        res.status(500).json({ error: 'session_create_failed', details: insertError.message });
        return;
      }

      const sessionPayload = mapRow(inserted as SessionRow, attempt ?? (inserted as any).attempt_snapshot ?? null);
      track('coach.writing.session', {
        action: 'created',
        sessionId: sessionPayload.id,
        attemptId: sessionPayload.attemptId ?? undefined,
      });
      res.status(201).json({ ok: true, session: sessionPayload });
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[coach.writing.session] create failed', error);
      res.status(500).json({ error: 'session_create_failed' });
      return;
    }
  }

  res.setHeader('Allow', 'GET,POST');
  res.status(405).json({ error: 'method_not_allowed' });
}

