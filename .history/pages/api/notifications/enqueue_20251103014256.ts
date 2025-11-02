import type { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';
import { supabaseService } from '@/lib/supabaseServer';
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

function authorised(req: NextApiRequest): boolean {
  const secret = resolveSecret();
  if (!secret) {
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
    return res.status(400).json({ 
      error: 'Invalid payload', 
      details: parsed.error.flatten() 
    });
  }

  return enqueueEvent(req, res, parsed.data);
}