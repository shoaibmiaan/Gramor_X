import type { NextApiRequest, NextApiResponse } from 'next';

import { trackor } from '@/lib/analytics/trackor.server';

type ResponseBody = { ok: true } | { ok: false; error: string };

type AllowedEvent = 'studyplan_create' | 'studyplan_update' | 'studyplan_task_complete';

const ALLOWED_EVENTS: AllowedEvent[] = ['studyplan_create', 'studyplan_update', 'studyplan_task_complete'];

function isAllowedEvent(event: string): event is AllowedEvent {
  return (ALLOWED_EVENTS as string[]).includes(event);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { event, payload } = req.body ?? {};
  if (!event || typeof event !== 'string' || !isAllowedEvent(event)) {
    return res.status(400).json({ ok: false, error: 'invalid_event' });
  }

  const safePayload = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  try {
    await trackor.log(event, safePayload);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/study-plan/events] failed to log event', err);
    return res.status(500).json({ ok: false, error: 'log_failed' });
  }
}
