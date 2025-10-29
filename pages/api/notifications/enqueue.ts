import type { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';

import { supabaseService } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import { EnqueueBody } from '@/types/notifications';
import { enqueueEvent } from '@/lib/notify';

const DEFAULT_RATE_LIMIT = 5;

function resolveSecret(): string | null {
  return process.env.NOTIFICATIONS_ENQUEUE_SECRET ?? null;
}

function resolveLimit(): number {
  const raw = process.env.NOTIFICATIONS_ENQUEUE_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_RATE_LIMIT;
}

async function withinRateLimit(payload: { user_id: string; event_key: string }): Promise<boolean> {
  const limit = resolveLimit();
  if (limit <= 0) {
    return true;
  }

  const service = supabaseService<Database>();
  const windowStart = DateTime.utc().startOf('day');

  const { count, error } = await service
    .from('notification_events')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', payload.user_id)
    .eq('event_key', payload.event_key)
    .gte('created_at', windowStart.toISO());

  if (error) {
    throw error;
  }

  if (typeof count === 'number' && count >= limit) {
    return false;
  }

  return true;
}

function authorised(req: NextApiRequest): boolean {
  const secret = resolveSecret();
  if (!secret) {
    // Require explicit configuration in production to avoid exposing the endpoint.
    return process.env.NODE_ENV !== 'production';
  }

  const header = req.headers['x-notifications-secret'] ?? req.headers['x-api-key'] ?? null;
  if (!header) return false;
  if (Array.isArray(header)) {
    return header.some((value) => value === secret);
  }
  return header === secret;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!authorised(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = EnqueueBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const allowed = await withinRateLimit(parsed.data);
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate rate limit';
    return res.status(500).json({ error: message });
  }

  return enqueueEvent(req, res, parsed.data);
}
