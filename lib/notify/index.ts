import type { NextApiRequest, NextApiResponse } from 'next';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

import { trackor } from '@/lib/analytics/trackor.server';
import { captureException } from '@/lib/monitoring/sentry';
import { supabaseService } from '@/lib/supabaseServer';
import { getBaseUrl } from '@/lib/url';
import { EnqueueBody, type Channel, type EnqueueBodyInput } from '@/types/notifications';
import type {
  Database,
  NotificationDelivery,
  NotificationEvent,
  NotificationTemplate,
  NotificationsOptIn,
  Profiles,
} from '@/types/supabase';

import { sendEmail } from './email';
import { renderTemplate } from './render';
import { allowedChannels, isInQuietHours } from './rules';
import { sendWhatsApp } from './sms';

type ServiceClient = SupabaseClient<Database>;

type NotificationEventRow = NotificationEvent & { id: string };
type NotificationDeliveryRow = NotificationDelivery & { id: string };
type NotificationTemplateRow = NotificationTemplate & { id: string };

type PreferencesRow = NotificationsOptIn & { user_id: string };

type ProfileRow = Profiles & { user_id: string };

interface DispatchSummary {
  attempted: number;
  sent: number;
  deferred: number;
  failed: number;
  noop: number;
}

interface UserNotificationContext {
  preferences: Record<Channel, boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
}

interface AttemptOutcome {
  attempted: boolean;
  sent: boolean;
  deferred: boolean;
  failed: boolean;
  noop: boolean;
}

export type EnqueueResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'duplicate'; message?: string; id?: string }
  | { ok: false; reason: 'error'; message: string };

export interface NotificationContact {
  email: string | null;
  phone: string | null;
  fullName: string | null;
  timezone: string | null;
}

const MAX_ATTEMPTS = 3;
const RETRY_MINUTES = [15, 30, 60];

function parseChannels(raw?: string[] | null): Channel[] {
  if (!raw) return [];
  const allowed: Channel[] = [];
  for (const value of raw) {
    if (value === 'email' || value === 'whatsapp') {
      allowed.push(value);
    }
  }
  return allowed;
}

function readString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function readBoolean(payload: Record<string, unknown>, key: string): boolean | null {
  const value = payload[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return null;
}

function buildSummary(): DispatchSummary {
  return { attempted: 0, sent: 0, deferred: 0, failed: 0, noop: 0 };
}

async function loadUserContext(client: ServiceClient, userId: string): Promise<UserNotificationContext> {
  const [{ data: pref }, { data: profile }] = await Promise.all([
    client
      .from('notifications_opt_in')
      .select('user_id, email_opt_in, sms_opt_in, wa_opt_in, channels, quiet_hours_start, quiet_hours_end, timezone')
      .eq('user_id', userId)
      .maybeSingle<PreferencesRow>(),
    client
      .from('profiles')
      .select('user_id, email, phone, full_name, timezone, notification_channels')
      .eq('user_id', userId)
      .maybeSingle<ProfileRow>(),
  ]);

  const prefChannels = new Set<Channel>(parseChannels((pref?.channels as string[] | null) ?? null));
  const profileChannels = new Set<string>((profile?.notification_channels ?? []) as string[]);

  if (profileChannels.has('email')) {
    prefChannels.add('email');
  }
  if (profileChannels.has('whatsapp')) {
    prefChannels.add('whatsapp');
  }

  if (pref?.wa_opt_in) {
    prefChannels.add('whatsapp');
  }
  if (pref?.email_opt_in ?? true) {
    prefChannels.add('email');
  }

  const preferences: Record<Channel, boolean> = {
    email: prefChannels.has('email'),
    whatsapp: prefChannels.has('whatsapp'),
  };

  const timezone = pref?.timezone || profile?.timezone || 'UTC';

  const email = profile?.email ? profile.email.trim() : null;
  const phone = profile?.phone ? profile.phone.trim() : null;

  return {
    preferences,
    quietHoursStart: (pref?.quiet_hours_start as string | null) ?? null,
    quietHoursEnd: (pref?.quiet_hours_end as string | null) ?? null,
    timezone,
    email: email && email.length > 0 ? email : null,
    phone: phone && phone.length > 0 ? phone : null,
    fullName: profile?.full_name ?? null,
  };
}

export async function getNotificationContact(userId: string): Promise<NotificationContact> {
  const client = supabaseService<Database>();
  const { data, error } = await client
    .from('profiles')
    .select('user_id, email, phone, full_name, timezone')
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>();

  if (error && (error as PostgrestError).code !== 'PGRST116') {
    captureException(error, { scope: 'notify:getContact', userId });
  }

  let email = data?.email ? data.email.trim() : null;
  const phone = data?.phone ? data.phone.trim() : null;
  if (!email) {
    try {
      const { data: userData } = await client.auth.admin.getUserById(userId);
      email = userData.user?.email ?? null;
    } catch (adminError) {
      captureException(adminError, { scope: 'notify:getContact:admin', userId });
    }
  }

  return {
    email: email && email.length > 0 ? email : null,
    phone: phone && phone.length > 0 ? phone : null,
    fullName: data?.full_name ?? null,
    timezone: data?.timezone ?? null,
  };
}

async function getTemplate(
  client: ServiceClient,
  eventKey: string,
  channel: Channel,
  locale: string,
): Promise<NotificationTemplateRow | null> {
  const { data, error } = await client
    .from('notification_templates')
    .select('*')
    .eq('template_key', eventKey)
    .eq('channel', channel)
    .eq('locale', locale)
    .maybeSingle<NotificationTemplateRow>();

  if (error) {
    console.error('[notify:template:error]', error.message);
    return null;
  }

  if (data) return data;
  if (locale === 'en') return null;

  const fallback = await client
    .from('notification_templates')
    .select('*')
    .eq('template_key', eventKey)
    .eq('channel', channel)
    .eq('locale', 'en')
    .maybeSingle<NotificationTemplateRow>();

  if (fallback.error) {
    console.error('[notify:template:error]', fallback.error.message);
    return null;
  }

  return fallback.data ?? null;
}

async function ensureDelivery(
  client: ServiceClient,
  eventId: string,
  channel: Channel,
  templateId: string | null,
): Promise<NotificationDeliveryRow | null> {
  const { data, error } = await client
    .from('notification_deliveries')
    .insert({ event_id: eventId, channel, template_id: templateId })
    .select('*')
    .single<NotificationDeliveryRow>();

  if (!error && data) {
    return data;
  }

  if (error && (error as PostgrestError).code === '23505') {
    const existing = await client
      .from('notification_deliveries')
      .select('*')
      .eq('event_id', eventId)
      .eq('channel', channel)
      .maybeSingle<NotificationDeliveryRow>();
    if (existing.error) {
      console.error('[notify:delivery:fetch]', existing.error.message);
      return null;
    }
    const row = existing.data ?? null;
    if (row && templateId && row.template_id !== templateId) {
      await client
        .from('notification_deliveries')
        .update({ template_id: templateId })
        .eq('id', row.id);
      row.template_id = templateId;
    }
    return row;
  }

  if (error) {
    console.error('[notify:delivery:create]', error.message);
  }

  return null;
}

function mergePayload(
  event: NotificationEventRow,
  context: UserNotificationContext,
): Record<string, unknown> {
  const payload = (event.payload as Record<string, unknown>) ?? {};
  const firstName =
    readString(payload, 'first_name') ||
    readString(payload, 'firstName') ||
    (context.fullName ? context.fullName.split(' ')[0] : null);

  const baseUrl = getBaseUrl();
  const manageUrl = `${baseUrl}/settings/notifications`;
  const unsubscribeUrl = `${manageUrl}?unsubscribe=1`;

  const defaults: Record<string, unknown> = {
    manage_notifications_url: manageUrl,
    unsubscribe_url: unsubscribeUrl,
  };

  if (!('user_email' in payload) && context.email) {
    defaults.user_email = context.email;
  }
  if (!('user_phone' in payload) && context.phone) {
    defaults.user_phone = context.phone;
  }

  return {
    ...defaults,
    ...payload,
    first_name: firstName ?? '',
    full_name: context.fullName ?? '',
  };
}

async function attemptDelivery(
  client: ServiceClient,
  event: NotificationEventRow,
  delivery: NotificationDeliveryRow,
  template: NotificationTemplateRow,
  context: UserNotificationContext,
  now: DateTime,
): Promise<AttemptOutcome> {
  const payload = mergePayload(event, context);
  const bypassQuiet = Boolean(readBoolean(payload, 'bypass_quiet_hours') ?? false);
  const quiet = !bypassQuiet &&
    isInQuietHours({
      now: now.toJSDate(),
      quietHoursStart: context.quietHoursStart,
      quietHoursEnd: context.quietHoursEnd,
      timezone: context.timezone,
    });

  if (quiet) {
    const nextRetry = now.plus({ minutes: RETRY_MINUTES[0] }).toISO();
    await client
      .from('notification_deliveries')
      .update({ status: 'deferred', next_retry_at: nextRetry })
      .eq('id', delivery.id);
    return { attempted: false, sent: false, deferred: true, failed: false, noop: false };
  }

  const nowIso = now.toISO();
  let outcome: AttemptOutcome = { attempted: true, sent: false, deferred: false, failed: false, noop: false };
  let errorMessage: string | null = null;
  let noop = false;
  let metadata = delivery.metadata as Record<string, unknown> | null;
  metadata = metadata ? { ...metadata } : {};

  if (delivery.channel === 'email') {
    const to = readString(payload, 'user_email') || context.email;
    if (!to) {
      errorMessage = 'Missing email recipient';
    } else {
      const subjectTemplate = template.subject ?? '';
      const subject = renderTemplate(subjectTemplate, payload);
      const body = renderTemplate(template.body, payload);
      const html = body.replace(/\n/g, '<br />');
      const result = await sendEmail({ to, subject, text: body, html });
      noop = Boolean(result.noop);
      if (result.ok) {
        outcome = { attempted: true, sent: true, deferred: false, failed: false, noop };
        if (result.id) {
          metadata.messageId = result.id;
        }
      } else {
        errorMessage = result.error ?? 'Email send failed';
      }
    }
  } else {
    const to = readString(payload, 'user_phone') || context.phone;
    if (!to) {
      errorMessage = 'Missing WhatsApp recipient';
    } else {
      const body = renderTemplate(template.body, payload);
      const result = await sendWhatsApp({ to, body });
      noop = Boolean(result.noop);
      if (result.ok) {
        outcome = { attempted: true, sent: true, deferred: false, failed: false, noop };
        if (result.id) {
          metadata.messageSid = result.id;
        }
      } else {
        errorMessage = result.error ?? 'WhatsApp send failed';
      }
    }
  }

  const attempts = delivery.attempt_count + 1;
  const update: Partial<NotificationDeliveryRow> = {
    attempt_count: attempts,
    last_attempt_at: nowIso,
    metadata,
  };

  if (!errorMessage) {
    update.status = 'sent';
    update.sent_at = nowIso;
    update.error = null;
    update.next_retry_at = null;
  } else if (attempts >= MAX_ATTEMPTS) {
    update.status = 'failed';
    update.error = errorMessage;
    update.next_retry_at = null;
    outcome = { attempted: true, sent: false, deferred: false, failed: true, noop: false };
  } else {
    const delayMinutes = RETRY_MINUTES[Math.min(attempts, RETRY_MINUTES.length) - 1];
    update.status = 'deferred';
    update.error = errorMessage;
    update.next_retry_at = now.plus({ minutes: delayMinutes }).toISO();
    outcome = { attempted: true, sent: false, deferred: true, failed: false, noop: false };
  }

  await client
    .from('notification_deliveries')
    .update(update)
    .eq('id', delivery.id);

  if (outcome.sent) {
    await trackor.log('delivery_sent', {
      eventId: event.id,
      deliveryId: delivery.id,
      userId: event.user_id,
      channel: delivery.channel,
      attempts,
      noop,
    });
  } else if (outcome.failed) {
    await trackor.log('delivery_failed', {
      eventId: event.id,
      deliveryId: delivery.id,
      userId: event.user_id,
      channel: delivery.channel,
      attempts,
      error: errorMessage ?? update.error ?? null,
    });
  }

  return outcome;
}

async function processEvent(
  client: ServiceClient,
  event: NotificationEventRow,
  now: DateTime,
): Promise<DispatchSummary> {
  const summary = buildSummary();
  try {
    const context = await loadUserContext(client, event.user_id);
    const requestedChannels = parseChannels((event.requested_channels as string[] | null) ?? null);
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const bypassQuiet = readBoolean(payload, 'bypass_quiet_hours') ?? false;

    const quiet = !bypassQuiet &&
      isInQuietHours({
        now: now.toJSDate(),
        quietHoursStart: context.quietHoursStart,
        quietHoursEnd: context.quietHoursEnd,
        timezone: context.timezone,
      });

    const allowed = allowedChannels({
      preferences: context.preferences,
      requestedChannels,
      quiet,
      quietOverrides: bypassQuiet ? requestedChannels : [],
    });

    if (allowed.length === 0) {
      await client
        .from('notification_events')
        .update({ processed_at: now.toISO(), error: 'No channels allowed' })
        .eq('id', event.id);
      return summary;
    }

    for (const channel of allowed) {
      const template = await getTemplate(client, event.event_key, channel, event.locale ?? 'en');
      const delivery = await ensureDelivery(client, event.id, channel, template?.id ?? null);

      if (!delivery) {
        summary.failed += 1;
        summary.attempted += 1;
        continue;
      }

      if (!template) {
        const attempts = delivery.attempt_count + 1;
        await client
          .from('notification_deliveries')
          .update({
            status: 'failed',
            error: `Template not found for ${event.event_key}/${channel}`,
            next_retry_at: null,
            last_attempt_at: now.toISO(),
          })
          .eq('id', delivery.id);
        await trackor.log('delivery_failed', {
          eventId: event.id,
          deliveryId: delivery.id,
          userId: event.user_id,
          channel,
          attempts,
          error: `Template not found for ${event.event_key}/${channel}`,
        });
        summary.failed += 1;
        summary.attempted += 1;
        continue;
      }

      const outcome = await attemptDelivery(client, event, delivery, template, context, now);
      if (outcome.attempted) {
        summary.attempted += 1;
      }
      if (outcome.sent) {
        summary.sent += 1;
      }
      if (outcome.deferred) {
        summary.deferred += 1;
      }
      if (outcome.failed) {
        summary.failed += 1;
      }
      if (outcome.noop) {
        summary.noop += 1;
      }
    }

    await client
      .from('notification_events')
      .update({ processed_at: now.toISO(), error: null })
      .eq('id', event.id);
  } catch (error) {
    captureException(error, { scope: 'notify:dispatch:event', eventId: event.id });
    const message = error instanceof Error ? error.message : 'Unknown dispatcher error';
    await client
      .from('notification_events')
      .update({ processed_at: now.toISO(), error: message })
      .eq('id', event.id);
    summary.failed += 1;
  }

  return summary;
}

async function processDelivery(
  client: ServiceClient,
  delivery: NotificationDeliveryRow,
  now: DateTime,
): Promise<DispatchSummary> {
  const summary = buildSummary();
  const { data: event, error } = await client
    .from('notification_events')
    .select('*')
    .eq('id', delivery.event_id)
    .maybeSingle<NotificationEventRow>();

  if (error) {
    captureException(error, { scope: 'notify:delivery:event', deliveryId: delivery.id });
    return summary;
  }

  if (!event) {
    await client
      .from('notification_deliveries')
      .update({ status: 'failed', error: 'Event missing', next_retry_at: null })
      .eq('id', delivery.id);
    await trackor.log('delivery_failed', {
      eventId: delivery.event_id,
      deliveryId: delivery.id,
      userId: null,
      channel: delivery.channel,
      attempts: delivery.attempt_count + 1,
      error: 'Event missing',
    });
    summary.failed += 1;
    summary.attempted += 1;
    return summary;
  }

  const template = await getTemplate(client, event.event_key, delivery.channel as Channel, event.locale ?? 'en');
  if (!template) {
    await client
      .from('notification_deliveries')
      .update({
        status: 'failed',
        error: `Template not found for ${event.event_key}/${delivery.channel}`,
        next_retry_at: null,
        last_attempt_at: now.toISO(),
      })
      .eq('id', delivery.id);
    await trackor.log('delivery_failed', {
      eventId: event.id,
      deliveryId: delivery.id,
      userId: event.user_id,
      channel: delivery.channel,
      attempts: delivery.attempt_count + 1,
      error: `Template not found for ${event.event_key}/${delivery.channel}`,
    });
    summary.failed += 1;
    summary.attempted += 1;
    return summary;
  }

  const context = await loadUserContext(client, event.user_id);
  const outcome = await attemptDelivery(client, event, delivery, template, context, now);

  if (outcome.attempted) summary.attempted += 1;
  if (outcome.sent) summary.sent += 1;
  if (outcome.deferred) summary.deferred += 1;
  if (outcome.failed) summary.failed += 1;
  if (outcome.noop) summary.noop += 1;

  return summary;
}

async function insertEvent(payload: EnqueueBodyInput): Promise<EnqueueResult> {
  const service = supabaseService<Database>();
  const insertPayload = {
    user_id: payload.user_id,
    event_key: payload.event_key,
    locale: payload.locale ?? 'en',
    payload: payload.payload ?? {},
    requested_channels: payload.channels ?? [],
    idempotency_key: payload.idempotency_key ?? null,
  };

  const { data, error } = await service
    .from('notification_events')
    .insert(insertPayload)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    const code = (error as PostgrestError).code;
    if (code === '23505') {
      let existingId: string | undefined;
      if (payload.idempotency_key) {
        const { data: existing } = await service
          .from('notification_events')
          .select('id')
          .eq('idempotency_key', payload.idempotency_key)
          .maybeSingle<{ id: string }>();
        existingId = existing?.id;
      }
      return { ok: false, reason: 'duplicate', message: 'Event already enqueued', id: existingId };
    }

    captureException(error, {
      scope: 'notify:enqueue',
      eventKey: payload.event_key,
      userId: payload.user_id,
    });
    return { ok: false, reason: 'error', message: error.message };
  }

  await trackor.log('notification_enqueued', {
    eventKey: payload.event_key,
    userId: payload.user_id,
    id: data.id,
    channels: payload.channels ?? [],
    locale: payload.locale ?? 'en',
  });

  return { ok: true, id: data.id };
}

export async function enqueueEvent(
  _req: NextApiRequest,
  res: NextApiResponse,
  body: unknown,
) {
  const parsed = EnqueueBody.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const result = await insertEvent(parsed.data);

  if (result.ok) {
    return res.status(200).json({ id: result.id });
  }

  if (result.reason === 'duplicate') {
    return res
      .status(409)
      .json({ error: result.message ?? 'Event already enqueued', id: result.id });
  }

  return res.status(500).json({ error: result.message });
}

export async function queueNotificationEvent(payload: EnqueueBodyInput): Promise<EnqueueResult> {
  const parsed = EnqueueBody.parse(payload);
  return insertEvent(parsed);
}

export async function dispatchPending(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  const service = supabaseService<Database>();
  const now = DateTime.utc();
  const summary = {
    eventsProcessed: 0,
    deliveriesAttempted: 0,
    deliveriesSent: 0,
    deliveriesDeferred: 0,
    deliveriesFailed: 0,
    deliveriesNoop: 0,
  };

  const { data: events, error: eventError } = await service
    .from('notification_events')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(20);

  if (eventError) {
    return res.status(500).json({ error: eventError.message });
  }

  if (events) {
    for (const event of events as NotificationEventRow[]) {
      summary.eventsProcessed += 1;
      const result = await processEvent(service, event, now);
      summary.deliveriesAttempted += result.attempted;
      summary.deliveriesSent += result.sent;
      summary.deliveriesDeferred += result.deferred;
      summary.deliveriesFailed += result.failed;
      summary.deliveriesNoop += result.noop;
    }
  }

  const { data: deliveries, error: deliveriesError } = await service
    .from('notification_deliveries')
    .select('*')
    .in('status', ['pending', 'deferred'])
    .order('created_at', { ascending: true })
    .limit(25);

  if (deliveriesError) {
    return res.status(500).json({ error: deliveriesError.message });
  }

  if (deliveries) {
    for (const delivery of deliveries as NotificationDeliveryRow[]) {
      if (delivery.status === 'deferred' && delivery.next_retry_at) {
        const retry = DateTime.fromISO(delivery.next_retry_at);
        if (retry.isValid && retry > now) {
          continue;
        }
      }

      const result = await processDelivery(service, delivery, now);
      summary.deliveriesAttempted += result.attempted;
      summary.deliveriesSent += result.sent;
      summary.deliveriesDeferred += result.deferred;
      summary.deliveriesFailed += result.failed;
      summary.deliveriesNoop += result.noop;
    }
  }

  return res.status(200).json({ ok: true, summary });
}
