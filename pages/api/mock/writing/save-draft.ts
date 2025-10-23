// pages/api/mock/writing/save-draft.ts
// Autosave endpoint for writing attempts. Supports POST (save), GET (load), and PUT (log events).

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { writingDraftSchema } from '@/lib/validation/writing';

const ok = (res: NextApiResponse, payload: Record<string, unknown> = {}) => res.status(200).json({ ok: true, ...payload });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const attemptId = req.query.attemptId as string | undefined;
    if (!attemptId) {
      return res.status(400).json({ error: 'Missing attemptId' });
    }
    const { data, error } = await supabase
      .from('exam_events')
      .select('payload, occurred_at')
      .eq('attempt_id', attemptId)
      .eq('user_id', user.id)
      .eq('event_type', 'autosave')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      return ok(res, { draft: null });
    }
    const payload = (data.payload || {}) as any;
    return ok(res, {
      draft: {
        attemptId,
        updatedAt: data.occurred_at,
        task1: payload.tasks?.task1
          ? { essay: payload.tasks.task1.content ?? '', wordCount: payload.tasks.task1.wordCount ?? 0 }
          : undefined,
        task2: payload.tasks?.task2
          ? { essay: payload.tasks.task2.content ?? '', wordCount: payload.tasks.task2.wordCount ?? 0 }
          : undefined,
      },
    });
  }

  if (req.method === 'PUT') {
    const parsed = writingDraftSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
    }
    const { attemptId, event, payload } = parsed.data;
    if (!event) {
      return res.status(400).json({ error: 'Event type required' });
    }
    await supabase.from('exam_events').insert({
      attempt_id: attemptId,
      user_id: user.id,
      event_type: event,
      payload: payload ?? {},
    });
    return ok(res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST,PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = writingDraftSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const { attemptId, tasks, activeTask, elapsedSeconds } = parsed.data;
  if (!attemptId) {
    return res.status(400).json({ error: 'attemptId is required' });
  }

  const nowIso = new Date().toISOString();

  const entries = Object.entries(tasks ?? {}) as Array<[
    'task1' | 'task2',
    { content: string; wordCount: number } | undefined
  ]>;
  for (const [task, snapshot] of entries) {
    if (!snapshot) continue;
    const { error: upsertError } = await supabase
      .from('writing_responses')
      .upsert(
        {
          user_id: user.id,
          exam_attempt_id: attemptId,
          task,
          task_type: task,
          answer_text: snapshot.content,
          word_count: snapshot.wordCount,
          duration_seconds: elapsedSeconds ?? null,
          evaluation_version: 'draft',
        },
        { onConflict: 'exam_attempt_id,task' },
      );
    if (upsertError) {
      console.error('[writing/save-draft] upsert failed', upsertError);
    }
  }

  const { error: eventError } = await supabase.from('exam_events').insert({
    attempt_id: attemptId,
    user_id: user.id,
    event_type: 'autosave',
    payload: {
      tasks,
      activeTask: activeTask ?? null,
      elapsedSeconds: elapsedSeconds ?? null,
    },
    occurred_at: nowIso,
  });

  if (eventError) {
    console.error('[writing/save-draft] event insert failed', eventError);
  }

  return ok(res, { savedAt: nowIso });
}
