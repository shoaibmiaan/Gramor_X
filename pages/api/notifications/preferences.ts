import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { buildWhatsAppTaskMessage, dispatchWhatsAppTask } from '@/lib/tasks/whatsapp';
import {
  NotificationPreferencesSchema,
  UpdateNotificationPreferencesSchema,
  type NotificationPreferences,
  type UpdateNotificationPreferences,
} from '@/lib/schemas/notifications';

async function loadPreferences(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  fallbackEmail: string | null,
): Promise<NotificationPreferences> {
  const [{ data: profile, error: profileError }, { data: optIn, error: optError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('email, phone, phone_verified, notification_channels, whatsapp_opt_in')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('notifications_opt_in')
      .select('email_opt_in, sms_opt_in, wa_opt_in')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (optError) {
    throw new Error(optError.message);
  }

  const rawEmail = profile?.email ?? fallbackEmail ?? null;
  const emailParse = rawEmail ? z.string().email().safeParse(rawEmail) : null;
  const safeEmail = emailParse && emailParse.success ? rawEmail : null;

  const preferences = NotificationPreferencesSchema.parse({
    email: safeEmail,
    emailOptIn: optIn?.email_opt_in ?? true,
    whatsappOptIn: optIn?.wa_opt_in ?? Boolean(profile?.whatsapp_opt_in),
    smsOptIn: optIn?.sms_opt_in ?? false,
    phone: profile?.phone ?? null,
    phoneVerified: Boolean(profile?.phone_verified),
  });

  return preferences;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const preferences = await loadPreferences(supabase, user.id, user.email ?? null);
      return res.status(200).json({ preferences });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'PATCH') {
    const parsed = UpdateNotificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const body: UpdateNotificationPreferences = parsed.data;

    try {
      const [{ data: profile }, { data: currentOptIn }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, phone, phone_verified, notification_channels, whatsapp_opt_in')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('notifications_opt_in')
          .select('email_opt_in, sms_opt_in, wa_opt_in')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const nextOptIn = {
        email_opt_in: currentOptIn?.email_opt_in ?? true,
        sms_opt_in: currentOptIn?.sms_opt_in ?? false,
        wa_opt_in: currentOptIn?.wa_opt_in ?? Boolean(profile?.whatsapp_opt_in),
      };

      if (typeof body.emailOptIn === 'boolean') {
        nextOptIn.email_opt_in = body.emailOptIn;
      }
      if (typeof body.smsOptIn === 'boolean') {
        nextOptIn.sms_opt_in = body.smsOptIn;
      }
      if (typeof body.whatsappOptIn === 'boolean') {
        nextOptIn.wa_opt_in = body.whatsappOptIn;
      }

      const upsertOpt = await supabase
        .from('notifications_opt_in')
        .upsert({ user_id: user.id, ...nextOptIn });
      if (upsertOpt.error) {
        throw upsertOpt.error;
      }

      const currentChannels = new Set<string>((profile?.notification_channels ?? []) as string[]);
      const shouldUpdateChannels =
        typeof body.emailOptIn === 'boolean' || typeof body.whatsappOptIn === 'boolean' || typeof body.smsOptIn === 'boolean';

      const profileUpdate: Record<string, unknown> = {};
      if (typeof body.phoneVerified === 'boolean') {
        profileUpdate.phone_verified = body.phoneVerified;
      }
      if (body.phone) {
        profileUpdate.phone = body.phone;
      }

      if (typeof body.emailOptIn === 'boolean') {
        if (body.emailOptIn) {
          currentChannels.add('email');
        } else {
          currentChannels.delete('email');
        }
      }
      if (typeof body.whatsappOptIn === 'boolean') {
        if (body.whatsappOptIn) {
          currentChannels.add('whatsapp');
        } else {
          currentChannels.delete('whatsapp');
        }
        profileUpdate.whatsapp_opt_in = body.whatsappOptIn;
      }
      if (typeof body.smsOptIn === 'boolean') {
        if (body.smsOptIn) {
          currentChannels.add('sms');
        } else {
          currentChannels.delete('sms');
        }
      }

      if (shouldUpdateChannels) {
        profileUpdate.notification_channels = Array.from(currentChannels);
      }

      if (Object.keys(profileUpdate).length > 0) {
        const upsertProfile = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, ...profileUpdate });
        if (upsertProfile.error) {
          throw upsertProfile.error;
        }
      }

      const events: {
        user_id: string;
        actor_id: string;
        channel: 'email' | 'sms' | 'whatsapp';
        action: 'opt_in' | 'opt_out' | 'verify' | 'test_message' | 'task';
        metadata?: Record<string, unknown>;
      }[] = [];

      if (
        typeof body.emailOptIn === 'boolean' &&
        body.emailOptIn !== (currentOptIn?.email_opt_in ?? true)
      ) {
        events.push({
          user_id: user.id,
          actor_id: user.id,
          channel: 'email',
          action: body.emailOptIn ? 'opt_in' : 'opt_out',
        });
      }

      if (
        typeof body.whatsappOptIn === 'boolean' &&
        body.whatsappOptIn !== (currentOptIn?.wa_opt_in ?? Boolean(profile?.whatsapp_opt_in))
      ) {
        events.push({
          user_id: user.id,
          actor_id: user.id,
          channel: 'whatsapp',
          action: body.whatsappOptIn ? 'opt_in' : 'opt_out',
        });
      }

      if (body.phoneVerified && !profile?.phone_verified) {
        events.push({
          user_id: user.id,
          actor_id: user.id,
          channel: 'whatsapp',
          action: 'verify',
          metadata: { method: 'otp' },
        });
      }

      if (events.length > 0) {
        const insertEvents = await supabase.from('notification_consent_events').insert(events);
        if (insertEvents.error) {
          throw insertEvents.error;
        }
      }

      const shouldSendTest = Boolean(body.sendTest && nextOptIn.wa_opt_in);
      if (shouldSendTest) {
        const response = await dispatchWhatsAppTask(supabase, {
          userId: user.id,
          type: 'test',
          message: buildWhatsAppTaskMessage('testPing'),
          metadata: {
            source: 'api/notifications/preferences',
            trigger: 'sendTest',
          },
        });

        if (response.error) {
          const errMessage =
            response.error instanceof Error
              ? response.error.message
              : typeof response.error === 'string'
              ? response.error
              : 'Failed to send WhatsApp test message';
          throw new Error(errMessage);
        }
      }

      const preferences = await loadPreferences(supabase, user.id, user.email ?? null);
      return res.status(200).json({ preferences });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', 'GET,PATCH');
  return res.status(405).end('Method Not Allowed');
}
