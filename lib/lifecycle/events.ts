// lib/lifecycle/events.ts
// Server helpers to enqueue lifecycle notification events.

import { supabaseService } from '@/lib/supabaseServer';
import { renderLifecycleTemplate, type LifecycleEventType } from '@/lib/lifecycle/templates';
import type { Database } from '@/types/supabase';

type LifecycleChannel = 'email' | 'whatsapp';

export type LifecycleTriggerOptions = {
  userId: string;
  event: LifecycleEventType;
  context?: Record<string, unknown>;
  dedupeKey?: string | null;
};

export type LifecycleTriggerResult =
  | { ok: true; id: number; channels: LifecycleChannel[]; locale: string }
  | { ok: false; reason: 'no_channels' | 'duplicate'; id?: number; channels?: LifecycleChannel[] };

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};
  try {
    return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
  } catch {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      const type = typeof value;
      if (value === null || type === 'string' || type === 'number' || type === 'boolean') {
        safe[key] = value as unknown;
      }
    }
    return safe;
  }
}

function extractNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function computeDedupeKey(
  event: LifecycleEventType,
  context: Record<string, unknown>,
  explicit?: string | null,
): string {
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  if (event === 'band_up') {
    const band =
      extractNumber(context.band) ??
      extractNumber((context as Record<string, unknown>).targetBand) ??
      extractNumber((context as Record<string, unknown>).toBand);
    if (band !== null) {
      return `band:${band}`;
    }
  }

  if (event === 'streak_broken') {
    const streak =
      extractNumber(context.streakDays) ??
      extractNumber(context.days) ??
      extractNumber(context.streak);
    if (streak !== null) {
      return `streak:${streak}`;
    }
    const date = (context.date ?? context.day ?? context.eventDate) as string | undefined;
    if (typeof date === 'string' && date.trim().length > 0) {
      return `streak:${date.trim()}`;
    }
  }

  return event;
}

export async function enqueueLifecycleEvent(
  options: LifecycleTriggerOptions,
): Promise<LifecycleTriggerResult> {
  const client = supabaseService<Database>();
  const safeContext = sanitizeContext(options.context);

  const [{ data: profile, error: profileError }, { data: optIn, error: optError }] = await Promise.all([
    client
      .from('profiles')
      .select(
        'user_id, full_name, email, phone, phone_verified, whatsapp_opt_in, notification_channels, locale, preferred_language',
      )
      .eq('user_id', options.userId)
      .maybeSingle(),
    client
      .from('notifications_opt_in')
      .select('email_opt_in, sms_opt_in, wa_opt_in')
      .eq('user_id', options.userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (optError) {
    throw new Error(optError.message);
  }

  let email = (profile?.email ?? null) as string | null;
  if (!email) {
    try {
      const { data: userData } = await client.auth.admin.getUserById(options.userId);
      email = userData.user?.email ?? null;
    } catch {
      // ignore admin lookup failures
    }
  }

  const phone = typeof profile?.phone === 'string' ? profile.phone : null;
  const rawPhoneVerified = profile?.phone_verified;
  const phoneVerified = rawPhoneVerified === null || rawPhoneVerified === undefined ? true : Boolean(rawPhoneVerified);
  const emailOptIn = optIn?.email_opt_in ?? true;
  const whatsappOptIn = optIn?.wa_opt_in ?? Boolean(profile?.whatsapp_opt_in);

  const channels: LifecycleChannel[] = [];
  if (emailOptIn && email) {
    channels.push('email');
  }
  if (whatsappOptIn && phone && phoneVerified) {
    channels.push('whatsapp');
  }

  if (channels.length === 0) {
    return { ok: false, reason: 'no_channels' };
  }

  const dedupeKey = computeDedupeKey(options.event, safeContext, options.dedupeKey ?? null);

  const { data: inserted, error } = await client
    .from('lifecycle_events')
    .insert({
      user_id: options.userId,
      event: options.event,
      context: safeContext,
      dedupe_key: dedupeKey,
      channels,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await client
        .from('lifecycle_events')
        .select('id, channels')
        .eq('user_id', options.userId)
        .eq('event', options.event)
        .eq('dedupe_key', dedupeKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingChannels = Array.isArray(existing?.channels)
        ? (existing!.channels as string[]).filter((value): value is LifecycleChannel =>
            value === 'email' || value === 'whatsapp',
          )
        : undefined;

      return {
        ok: false,
        reason: 'duplicate',
        id: existing?.id ?? undefined,
        channels: existingChannels,
      };
    }
    throw new Error(error.message);
  }

  const rendered = renderLifecycleTemplate(options.event, {
    name: profile?.full_name ?? undefined,
    locale: profile?.locale ?? profile?.preferred_language ?? undefined,
    context: safeContext,
  });

  try {
    await client.functions.invoke('lifecycle-worker', {
      body: { eventIds: [inserted.id] },
    });
  } catch {
    // worker invocation best-effort
  }

  return {
    ok: true,
    id: inserted.id,
    channels,
    locale: rendered.locale,
  };
}
