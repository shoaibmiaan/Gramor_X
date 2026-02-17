// pages/api/mock/writing/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { writingStartSchema } from '@/lib/validation/writing';
import type { WritingPrompt } from '@/types/writing';

const mapPrompt = (row: any): WritingPrompt => {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.topic ?? 'Untitled',
    promptText: row.prompt_text ?? null,
    taskType: row.task_type ?? 'task2',
    module: 'academic',
    difficulty: null,
    source: null,
    tags: null,
    estimatedMinutes: null,
    wordTarget: null,
    metadata: null,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = getServerClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = writingStartSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
    }

    const { promptId, goalBand, mockId } = parsed.data;

    const selectFields = 'id, slug, topic, prompt_text, task_type';

    // Task 1
    const { data: task1Row, error: task1Error } = await supabase
      .from('writing_prompts')
      .select(selectFields)
      .eq('task_type', 'task1')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (task1Error || !task1Row) {
      console.error('[Task 1] Fetch failed:', task1Error);
      return res.status(500).json({ error: 'Task 1 prompt unavailable' });
    }

    // Task 2
    let task2Row: any = null;
    if (promptId) {
      const { data } = await supabase
        .from('writing_prompts')
        .select(selectFields)
        .or(`id.eq.${promptId},slug.eq.${promptId}`)
        .maybeSingle();
      task2Row = data;
    }

    if (!task2Row) {
      const { data, error } = await supabase
        .from('writing_prompts')
        .select(selectFields)
        .eq('task_type', 'task2')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.error('[Task 2] Fetch failed:', error);
        return res.status(500).json({ error: 'Task 2 prompt unavailable' });
      }
      task2Row = data;
    }

    const durationSeconds = 60 * 60;
    const derivedMockId = mockId || task2Row.slug || task2Row.id || 'adhoc';

    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert({
        user_id: user.id,
        exam_type: 'writing',
        status: 'in_progress',
        duration_seconds: durationSeconds,
        goal_band: goalBand ?? null,
        mock_id: derivedMockId,
        started_at: new Date().toISOString(),
        metadata: {
          mockId: derivedMockId,
          module: 'writing',
          promptIds: { task1: task1Row.id, task2: task2Row.id },
        },
      })
      .select('id, started_at, duration_seconds, status, created_at')
      .single();

    if (attemptError || !attempt) {
      console.error('[exam_attempts] Insert failed:', attemptError);
      return res.status(500).json({ error: 'Failed to create attempt', details: attemptError?.message });
    }

    // Non-critical analytics event (requires exam_events.payload jsonb)
    const { error: eventError } = await supabase
      .from('exam_events')
      .insert({
        attempt_id: attempt.id,
        user_id: user.id,
        event_type: 'start',
        payload: {
          mockId: derivedMockId,
          promptIds: { task1: task1Row.id, task2: task2Row.id },
        },
      });

    if (eventError) {
      console.warn('[exam_events] Insert failed (non-critical):', eventError);
    }

    return res.status(200).json({
      ok: true,
      attempt: {
        id: attempt.id,
        startedAt: attempt.started_at ?? attempt.created_at ?? new Date().toISOString(),
        durationSeconds: attempt.duration_seconds ?? durationSeconds,
        status: attempt.status ?? 'in_progress',
      },
      prompts: {
        task1: mapPrompt(task1Row),
        task2: mapPrompt(task2Row),
      },
    });

  } catch (error: any) {
    console.error('[/api/mock/writing/start] ERROR:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
