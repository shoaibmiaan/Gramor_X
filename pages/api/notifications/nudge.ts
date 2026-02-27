import type { NextApiRequest, NextApiResponse } from 'next';
import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { enqueueEvent } from '@/lib/notify';
import { EnqueueBody } from '@/types/notifications';

const NudgeBody = EnqueueBody.pick({
  user_id: true,
  event_key: true,
  payload: true,
  channels: true,
  locale: true,
  bypass_quiet_hours: true,
}).extend({
  event_key: EnqueueBody.shape.event_key.default('nudge_manual'),
});

function buildIdempotencyKey(userId: string, eventKey: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${eventKey}:${userId}:${today}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse, ctx?: PlanGuardContext) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const role = ctx?.role ?? null;
  if (!role || (role !== 'admin' && role !== 'teacher')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parsed = NudgeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid payload', 
      details: parsed.error.flatten() 
    });
  }

  const body = parsed.data;
  const idempotencyKey = buildIdempotencyKey(body.user_id, body.event_key);

  return enqueueEvent(req, res, { 
    ...body, 
    idempotency_key: idempotencyKey 
  });
}

export default withPlan('starter', handler, { allowRoles: ['admin', 'teacher'] });