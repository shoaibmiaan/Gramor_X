// pages/api/offline/sync.ts
// Processes offline draft and event batches submitted after reconnecting.

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { trackor } from '@/lib/analytics/trackor.server';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import { writingTaskTypeSchema } from '@/lib/validation/writing';

const draftTaskSnapshotSchema = z.object({
  content: z.string(),
  wordCount: z.number().int().nonnegative(),
});

const draftPayloadSchema = z.object({
  tasks: z
    .record(writingTaskTypeSchema, draftTaskSnapshotSchema.optional())
    .optional()
    .default({}),
  activeTask: writingTaskTypeSchema.optional(),
  elapsedSeconds: z.number().nonnegative().optional(),
});

const draftSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('writing'),
  attemptId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  payload: draftPayloadSchema,
});

const eventSchema = z.object({
  id: z.number().int().nonnegative(),
  kind: z.literal('writing'),
  attemptId: z.string().uuid(),
  eventType: z.enum(['focus', 'blur', 'typing']),
  occurredAt: z.number().int().nonnegative(),
  payload: z.record(z.any()).optional(),
  offlineId: z.string().min(1),
});

const syncSchema = z.object({
  drafts: z.array(draftSchema).optional(),
  events: z.array(eventSchema).optional(),
});

type SyncDraftInput = z.infer<typeof draftSchema>;
type SyncEventInput = z.infer<typeof eventSchema>;
type ServerClient = SupabaseClient<Database>;

const clampTimestamp = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return Date.now();
  }
  return value;
};

const toIso = (timestamp: number | undefined): string => new Date(clampTimestamp(timestamp)).toISOString();

const logServerError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV === 'production') return;
  if (typeof console === 'undefined') return;
  // eslint-disable-next-line no-console
  console.error(message, error);
};

const logServerWarn = (message: string, error: unknown) => {
  if (process.env.NODE_ENV === 'production') return;
  if (typeof console === 'undefined') return;
  // eslint-disable-next-line no-console
  console.warn(message, error);
};

const normalizeTasks = (
  tasks: SyncDraftInput['payload']['tasks'],
): Record<'task1' | 'task2', { content: string; wordCount: number }> => {
  const normalized: Record<'task1' | 'task2', { content: string; wordCount: number }> = {};
  if (!tasks) return normalized;
  for (const [task, snapshot] of Object.entries(tasks)) {
    if (task !== 'task1' && task !== 'task2') continue;
    if (!snapshot) continue;
    const content = typeof snapshot.content === 'string' ? snapshot.content : '';
    const wordCount = Math.max(0, Math.round(Number(snapshot.wordCount ?? 0)));
    normalized[task] = { content, wordCount };
  }
  return normalized;
};

async function syncDraft(
  client: ServerClient,
  userId: string,
  draft: SyncDraftInput,
): Promise<boolean> {
  const tasks = normalizeTasks(draft.payload?.tasks);
  const elapsedSeconds =
    typeof draft.payload?.elapsedSeconds === 'number' && Number.isFinite(draft.payload.elapsedSeconds)
      ? Math.max(0, Math.round(draft.payload.elapsedSeconds))
      : null;

  try {
    const taskEntries = Object.entries(tasks) as Array<[
      'task1' | 'task2',
      { content: string; wordCount: number }
    ]>;
    for (const [task, snapshot] of taskEntries) {
      const { error: upsertError } = await client
        .from('writing_responses')
        .upsert(
          {
            user_id: userId,
            exam_attempt_id: draft.attemptId,
            task,
            task_type: task,
            answer_text: snapshot.content,
            word_count: snapshot.wordCount,
            duration_seconds: elapsedSeconds,
            evaluation_version: 'draft',
          },
          { onConflict: 'exam_attempt_id,task' },
        );
      if (upsertError) {
        logServerError('[api/offline/sync] writing response upsert failed', upsertError);
        return false;
      }
    }

    const occurredAtIso = toIso(draft.updatedAt);

    const { data: existing } = await client
      .from('exam_events')
      .select('id')
      .eq('attempt_id', draft.attemptId)
      .eq('user_id', userId)
      .eq('event_type', 'autosave')
      .eq('payload->>offlineRevision', String(draft.revision))
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await client.from('exam_events').insert({
        attempt_id: draft.attemptId,
        user_id: userId,
        event_type: 'autosave',
        payload: {
          tasks,
          activeTask: draft.payload?.activeTask ?? null,
          elapsedSeconds,
          offlineRevision: draft.revision,
          offlineUpdatedAt: occurredAtIso,
        },
        occurred_at: occurredAtIso,
      });

      if (insertError) {
        logServerError('[api/offline/sync] autosave event insert failed', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    logServerError('[api/offline/sync] unexpected draft sync failure', error);
    return false;
  }
}

async function syncEvent(
  client: ServerClient,
  userId: string,
  event: SyncEventInput,
): Promise<boolean> {
  try {
    const { data: existing } = await client
      .from('exam_events')
      .select('id')
      .eq('attempt_id', event.attemptId)
      .eq('user_id', userId)
      .eq('event_type', event.eventType)
      .eq('payload->>offlineId', event.offlineId)
      .maybeSingle();

    if (existing) {
      return true;
    }

    const payload = {
      ...(event.payload ?? {}),
      offlineId: event.offlineId,
    } as Record<string, unknown>;

    const { error: insertError } = await client.from('exam_events').insert({
      attempt_id: event.attemptId,
      user_id: userId,
      event_type: event.eventType,
      payload,
      occurred_at: toIso(event.occurredAt),
    });

    if (insertError) {
      logServerError('[api/offline/sync] event insert failed', insertError);
      return false;
    }

    return true;
  } catch (error) {
    logServerError('[api/offline/sync] unexpected event sync failure', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = syncSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const drafts = parsed.data.drafts ?? [];
  const events = parsed.data.events ?? [];

  const syncedDraftIds: string[] = [];
  const syncedEventIds: number[] = [];

  for (const draft of drafts) {
    const ok = await syncDraft(supabase, user.id, draft);
    if (ok) {
      syncedDraftIds.push(draft.id);
    }
  }

  for (const event of events) {
    const ok = await syncEvent(supabase, user.id, event);
    if (ok) {
      syncedEventIds.push(event.id);
    }
  }

  if (drafts.length > 0 || events.length > 0) {
    try {
      await trackor.log('offline_sync_batch', {
        userId: user.id,
        requestedDrafts: drafts.length,
        syncedDrafts: syncedDraftIds.length,
        requestedEvents: events.length,
        syncedEvents: syncedEventIds.length,
      });
    } catch (error) {
      logServerWarn('[api/offline/sync] analytics failed', error);
    }
  }

  return res.status(200).json({ ok: true, syncedDraftIds, syncedEventIds });
}
