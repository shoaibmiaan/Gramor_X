// pages/api/notifications/index.ts
import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

type RawNotification = Record<string, any>;

type ApiNotification = {
  id: string;
  message: string;
  url: string | null;
  read: boolean;
  created_at: string;
};

const FALLBACK_MESSAGE = 'Notification';

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true';
  return fallback;
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseTimestamp(value: unknown): string {
  const date = value instanceof Date ? value : new Date(value as any);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapRow(row: RawNotification): ApiNotification {
  const idValue = row.id ?? row.notification_id ?? row.uuid ?? randomUUID();
  const message =
    row.message ??
    row.title ??
    row.subject ??
    row.body ??
    row.details ??
    row.data?.message ??
    FALLBACK_MESSAGE;

  const url =
    normalizeUrl(row.url) ??
    normalizeUrl(row.link) ??
    normalizeUrl(row.data?.url) ??
    normalizeUrl(row.data?.link) ??
    null;

  const read = toBoolean(row.read, toBoolean(row.is_read));

  return {
    id: typeof idValue === 'string' ? idValue : String(idValue),
    message,
    url,
    read,
    created_at: parseTimestamp(row.created_at ?? row.inserted_at ?? Date.now()),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const supabase = createSupabaseServerClient({ req, res });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { data, error } = await supabase
      .from<RawNotification>('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notifications] supabase error', error);
      return res.status(500).json({ error: error.message ?? 'db_error' });
    }

    const notifications = (data ?? []).map(mapRow);

    return res.status(200).json({ notifications });
  } catch (err: any) {
    console.error('[notifications] unhandled error', err);
    return res.status(500).json({ error: err?.message ?? 'unexpected' });
  }
}
