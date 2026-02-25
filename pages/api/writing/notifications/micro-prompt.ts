import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { createRequestLogger } from '@/lib/obs/logger';
import { getRequestId } from '@/lib/api/requestContext';
import { dispatchWhatsAppTask } from '@/lib/tasks/whatsapp';
import { buildRetakeReminder, ensureNotificationChannels, getDailyMicroPrompt, shouldSendMicroPromptToday } from '@/lib/writing/notifications';
import { MicroPromptRequestBody } from '@/lib/writing/schemas';

interface MicroPromptGetResponse {
  ok: true;
  message: string;
  lastSentAt: string | null;
  channels: string[];
  canSendWhatsApp: boolean;
  alreadySentToday: boolean;
  retakeReminder: {
    message: string;
    completion: number;
    missing: string[];
  } | null;
}

interface MicroPromptPostResponse {
  ok: true;
  message: string;
  delivered: { channel: string; notificationId?: string | null }[];
}

interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

type Response = MicroPromptGetResponse | MicroPromptPostResponse | ErrorResponse;

const ROUTE_NAME = 'api/writing/notifications/micro-prompt';

async function loadProfileAndPlan(supabase: ReturnType<typeof getServerClient>, userId: string) {
  const [profileRes, redraftRes, drillRes, mockRes, readinessRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('notification_channels, whatsapp_opt_in, phone, settings')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('writing_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('version_of', 'is', null),
    supabase
      .from('writing_drill_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('writing_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('version_of', null)
      .eq('status', 'scored'),
    supabase
      .from('writing_readiness')
      .select('window_start, window_end, status')
      .eq('user_id', userId)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profileRow: profileRes.data ?? null,
    planSummary: {
      redraftsCompleted: redraftRes.count ?? 0,
      drillsCompleted: drillRes.count ?? 0,
      mocksCompleted: mockRes.count ?? 0,
    },
    readiness: readinessRes.data ?? null,
  } as const;
}

async function getLastMicroPrompt(supabase: ReturnType<typeof getServerClient>, userId: string) {
  const { data } = await supabase
    .from('writing_notification_events')
    .select('id, channel, created_at, message')
    .eq('user_id', userId)
    .eq('type', 'micro_prompt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const requestId = getRequestId(req);
  const logger = createRequestLogger(ROUTE_NAME, { requestId });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.warn('unauthorized', { reason: authError?.message });
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'auth_required' });
  }

  if (req.method === 'GET') {
    const [{ profileRow, planSummary, readiness }, lastEvent] = await Promise.all([
      loadProfileAndPlan(supabase, user.id),
      getLastMicroPrompt(supabase, user.id),
    ]);

    const channels = ensureNotificationChannels(profileRow?.notification_channels ?? []);
    const microPrompt = getDailyMicroPrompt();
    const alreadySentToday = !shouldSendMicroPromptToday(lastEvent?.created_at ?? null);

    const retakeReminder = buildRetakeReminder(
      {
        windowStart:
          readiness?.window_start ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: readiness?.window_end ?? null,
        ...planSummary,
      },
      { redrafts: 6, drills: 8, mocks: 2 },
    );

    return res.status(200).json({
      ok: true,
      message: microPrompt.message,
      lastSentAt: lastEvent?.created_at ?? null,
      channels,
      canSendWhatsApp: channels.includes('whatsapp') && Boolean(profileRow?.whatsapp_opt_in),
      alreadySentToday,
      retakeReminder,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const parseResult = MicroPromptRequestBody.safeParse(req.body ?? {});
  if (!parseResult.success) {
    logger.warn('invalid body', { issues: parseResult.error.issues });
    return res.status(400).json({ ok: false, error: 'Invalid request body', code: 'invalid_body' });
  }

  const [{ profileRow }, lastEvent] = await Promise.all([
    loadProfileAndPlan(supabase, user.id),
    getLastMicroPrompt(supabase, user.id),
  ]);

  const allowedChannels = ensureNotificationChannels(
    parseResult.data.channels ?? profileRow?.notification_channels ?? [],
  );

  const microPrompt = getDailyMicroPrompt();
  const alreadySentToday = !shouldSendMicroPromptToday(lastEvent?.created_at ?? null);

  if (alreadySentToday) {
    logger.info('micro prompt already sent today', { userId: user.id, lastSentAt: lastEvent?.created_at });
    return res.status(200).json({
      ok: true,
      message: microPrompt.message,
      delivered: [],
    });
  }

  const deliveries: { channel: string; notificationId?: string | null }[] = [];

  if (allowedChannels.includes('in_app')) {
    const { data: notificationRow, error: notificationError } = await supabase
      .from('notifications')
      .insert({ user_id: user.id, message: microPrompt.message, url: '/writing' })
      .select('id')
      .single();

    if (notificationError) {
      logger.error('failed to create in-app notification', { error: notificationError.message });
      return res.status(500).json({ ok: false, error: 'Failed to queue notification', code: 'notification_failed' });
    }

    deliveries.push({ channel: 'in_app', notificationId: notificationRow?.id ?? null });

    await supabase.from('writing_notification_events').insert({
      user_id: user.id,
      channel: 'in_app',
      type: 'micro_prompt',
      message: microPrompt.message,
      metadata: { source: parseResult.data.source, notification_id: notificationRow?.id ?? null },
    });
  }

  if (allowedChannels.includes('whatsapp') && profileRow?.whatsapp_opt_in) {
    try {
      await dispatchWhatsAppTask(supabase, {
        userId: user.id,
        type: 'task',
        message: `${microPrompt.message}\n\nReply DONE when you have applied this tip in today’s draft.`,
        metadata: { source: ROUTE_NAME, reason: parseResult.data.source },
      });
      deliveries.push({ channel: 'whatsapp' });
      await supabase.from('writing_notification_events').insert({
        user_id: user.id,
        channel: 'whatsapp',
        type: 'micro_prompt',
        message: microPrompt.message,
        metadata: { source: parseResult.data.source, delivery: 'queued' },
      });
    } catch (error) {
      logger.error('failed to queue whatsapp task', { error: error instanceof Error ? error.message : error });
      return res.status(502).json({ ok: false, error: 'Failed to queue WhatsApp micro prompt', code: 'whatsapp_failed' });
    }
  }

  logger.info('micro prompt delivered', { userId: user.id, deliveries });

  return res.status(200).json({
    ok: true,
    message: microPrompt.message,
    delivered: deliveries,
  });
}
