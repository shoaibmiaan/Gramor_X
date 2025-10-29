import type { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';

import { queueNotificationEvent } from '@/lib/notify';
import { supabaseService } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import { getBaseUrl } from '@/lib/url';

const MAX_BATCH = Number(process.env.NOTIFICATIONS_STUDY_REMINDER_LIMIT ?? '200');

function authorised(req: NextApiRequest): boolean {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET ?? null;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const header = req.headers['x-cron-secret'];
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

  const client = supabaseService<Database>();
  const limit = Number.isFinite(MAX_BATCH) && MAX_BATCH > 0 ? Math.min(MAX_BATCH, 500) : 200;

  const { data: plans, error: plansError } = await client
    .from('study_plans')
    .select('user_id')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (plansError) {
    return res.status(500).json({ error: plansError.message });
  }

  const userIds = Array.from(
    new Set((plans ?? []).map((plan) => (plan.user_id as string | null)?.trim()).filter(Boolean)),
  ) as string[];

  if (userIds.length === 0) {
    return res.status(200).json({
      ok: true,
      summary: { scanned: 0, enqueued: 0, duplicates: 0, skipped: 0 },
    });
  }

  const [{ data: optInRows, error: optInError }, { data: profileRows, error: profileError }] = await Promise.all([
    client
      .from('notifications_opt_in')
      .select('user_id, email_opt_in, wa_opt_in, channels')
      .in('user_id', userIds),
    client
      .from('profiles')
      .select('user_id, email, phone')
      .in('user_id', userIds),
  ]);

  if (optInError) {
    return res.status(500).json({ error: optInError.message });
  }
  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  const optInMap = new Map<
    string,
    { email_opt_in?: boolean | null; wa_opt_in?: boolean | null; channels?: string[] | null }
  >();
  for (const row of optInRows ?? []) {
    const id = (row.user_id as string | null) ?? null;
    if (id) {
      optInMap.set(id, {
        email_opt_in: row.email_opt_in as boolean | null | undefined,
        wa_opt_in: row.wa_opt_in as boolean | null | undefined,
        channels: Array.isArray(row.channels) ? (row.channels as string[]) : null,
      });
    }
  }

  const profileMap = new Map<string, { email: string | null; phone: string | null }>();
  for (const row of profileRows ?? []) {
    const id = (row.user_id as string | null) ?? null;
    if (!id) continue;
    const email = typeof row.email === 'string' ? row.email.trim() : '';
    const phone = typeof row.phone === 'string' ? row.phone.trim() : '';
    profileMap.set(id, {
      email: email.length > 0 ? email : null,
      phone: phone.length > 0 ? phone : null,
    });
  }

  const baseUrl = getBaseUrl();
  const today = DateTime.utc().toISODate();

  let enqueued = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const opt = optInMap.get(userId);
    const rawChannels = new Set(opt?.channels ?? []);
    const emailFlag = opt?.email_opt_in;
    const waFlag = opt?.wa_opt_in;
    const emailEnabled =
      emailFlag === undefined || emailFlag === null ? rawChannels.has('email') || !opt : Boolean(emailFlag);
    const whatsappEnabled =
      waFlag === undefined || waFlag === null ? rawChannels.has('whatsapp') : Boolean(waFlag);

    if (!emailEnabled && !whatsappEnabled) {
      skipped += 1;
      continue;
    }

    const profile = profileMap.get(userId) ?? { email: null, phone: null };
    const requestedChannels: Array<'email' | 'whatsapp'> = [];
    if (emailEnabled && profile.email) requestedChannels.push('email');
    if (whatsappEnabled && profile.phone) requestedChannels.push('whatsapp');

    if (requestedChannels.length === 0) {
      skipped += 1;
      continue;
    }

    const payload: Record<string, unknown> = {
      module: 'Study Plan',
      deep_link: `${baseUrl}/study-plan`,
    };
    if (profile.email) payload.user_email = profile.email;
    if (profile.phone) payload.user_phone = profile.phone;

    const result = await queueNotificationEvent({
      event_key: 'study_reminder',
      user_id: userId,
      payload,
      channels: requestedChannels,
      idempotency_key: `study_reminder:${userId}:${today}`,
    });

    if (result.ok) {
      enqueued += 1;
    } else if (result.reason === 'duplicate') {
      duplicates += 1;
    } else {
      skipped += 1;
    }
  }

  return res.status(200).json({
    ok: true,
    summary: {
      scanned: userIds.length,
      enqueued,
      duplicates,
      skipped,
    },
  });
}
