import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { trackor } from '@/lib/analytics/trackor.server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const postSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown().optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

const querySchema = z.object({
  type: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

type EventRow = {
  id: number;
  attempt_id: string;
  user_id: string;
  event_type: string;
  payload: unknown;
  created_at: string;
  occurred_at: string | null;
};

const mapRow = (row: EventRow) => ({
  id: row.id,
  attemptId: row.attempt_id,
  eventType: row.event_type,
  payload: row.payload ?? null,
  createdAt: row.created_at,
  occurredAt: row.occurred_at ?? row.created_at,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { attemptId } = req.query;
  if (typeof attemptId !== 'string' || !attemptId) {
    return res.status(400).json({ error: 'Invalid attemptId' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) {
    return res.status(500).json({ error: userErr.message });
  }
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query' });
    }
    const { type, limit } = parsed.data;
    let query = supabase
      .from('exam_events')
      .select('id,attempt_id,user_id,event_type,payload,created_at,occurred_at')
      .eq('attempt_id', attemptId)
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(limit ?? 50);

    if (type) {
      query = query.eq('event_type', type);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const events = Array.isArray(data) ? data.map((row) => mapRow(row as EventRow)) : [];
    return res.status(200).json({ ok: true, events });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const { type, payload, occurredAt } = parsed.data;

  const insertPayload = {
    attempt_id: attemptId,
    user_id: user.id,
    event_type: type,
    payload: payload ?? null,
    occurred_at: occurredAt ?? null,
  };

  const { error } = await supabase.from('exam_events').insert(insertPayload);
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (type === 'start') {
    await trackor.log('core_exam_start', {
      attemptId,
      duration: 0,
      score: null,
    });
  }

  return res.status(200).json({ ok: true });
}
