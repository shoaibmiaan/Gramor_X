import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseFromRequest } from '@/lib/apiAuth';
import { sanitizeTopics } from '@/lib/push/topics';

const SUPPORTED_PLATFORMS = new Set(['web', 'ios', 'android']);

type RegisterBody = {
  token?: unknown;
  subscription?: unknown;
  topics?: unknown;
  platform?: unknown;
  metadata?: unknown;
  device?: unknown;
};

type ApiResponse =
  | { error: string }
  | {
      success: true;
      tokenId: string | null;
      platform: string;
      topics: string[];
    };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = supabaseFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = (req.body ?? {}) as RegisterBody;
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return res.status(400).json({ error: 'Missing push token' });
  }

  const platformRaw = typeof body.platform === 'string' ? body.platform.toLowerCase() : 'web';
  if (!SUPPORTED_PLATFORMS.has(platformRaw)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const topicsInput = Array.isArray(body.topics) ? (body.topics as unknown[]) : [];
  const topics = sanitizeTopics(topicsInput);

  const subscription = sanitizeSubscription(body.subscription);
  const { metadata, deviceId } = coerceDeviceMetadata(body.metadata, body.device);

  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    token,
    platform: platformRaw,
    topics,
    subscription,
    metadata,
    device_id: deviceId,
    last_seen_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(upsertPayload, { onConflict: 'token' })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to register push token', error);
    return res.status(400).json({ error: error.message });
  }

  await supabase
    .from('mobile_events')
    .insert({
      user_id: user.id,
      token_id: data?.id ?? null,
      event_type: 'register_token',
      topic: null,
      payload: {
        platform: platformRaw,
        topics,
        metadata,
      },
    })
    .select('id')
    .maybeSingle()
    .catch(() => {
      /* best-effort audit */
    });

  return res.status(200).json({ success: true, tokenId: data?.id ?? null, platform: platformRaw, topics });
}

function sanitizeSubscription(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const payload = input as Record<string, unknown>;
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint : null;
  const expirationTime =
    typeof payload.expirationTime === 'number' || payload.expirationTime === null
      ? payload.expirationTime
      : null;
  const keysRaw = payload.keys;
  let keys: Record<string, string | null> | null = null;
  if (keysRaw && typeof keysRaw === 'object' && !Array.isArray(keysRaw)) {
    const obj = keysRaw as Record<string, unknown>;
    keys = {
      p256dh: typeof obj.p256dh === 'string' ? obj.p256dh : null,
      auth: typeof obj.auth === 'string' ? obj.auth : null,
    };
  }

  return {
    ...(endpoint ? { endpoint } : {}),
    ...(expirationTime !== null ? { expirationTime } : {}),
    ...(keys ? { keys } : {}),
  };
}

function coerceDeviceMetadata(metadataInput: unknown, deviceInput: unknown) {
  const metadata = normalizeObject(metadataInput);
  const device = normalizeObject(deviceInput);
  const deviceId = typeof device?.id === 'string' ? device.id : undefined;

  const merged = {
    ...(metadata ?? {}),
    ...(device ? { device } : {}),
  };

  return {
    metadata: Object.keys(merged).length > 0 ? merged : null,
    deviceId,
  };
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
