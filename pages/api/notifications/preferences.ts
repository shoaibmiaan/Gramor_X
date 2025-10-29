import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import type { NotificationChannel, NotificationsOptIn, Profiles } from '@/types/supabase';
import { Channel, PreferencesBody, type PreferencesBodyInput } from '@/types/notifications';

type PreferencesRow = Pick<
  NotificationsOptIn,
  'channels' | 'email_opt_in' | 'wa_opt_in' | 'quiet_hours_start' | 'quiet_hours_end' | 'timezone'
> & { user_id: string };

type ProfileContact = Pick<Profiles, 'email' | 'phone' | 'phone_verified' | 'timezone'> & { user_id: string };

type PreferencesResponse = PreferencesBodyInput & {
  email: string | null;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  phone: string | null;
  phoneVerified: boolean;
};

function toChannelSet(row?: PreferencesRow | null): Set<NotificationChannel> {
  const next = new Set<NotificationChannel>();
  if (!row) {
    next.add('email');
    return next;
  }

  const channels = (row.channels ?? []) as NotificationChannel[];
  channels.forEach((channel) => {
    if (Channel.safeParse(channel).success) {
      next.add(channel);
    }
  });

  if (row.email_opt_in ?? true) {
    next.add('email');
  }

  if (row.wa_opt_in ?? false) {
    next.add('whatsapp');
  }

  return next;
}

function buildResponse(row: PreferencesRow | null, profile: ProfileContact | null): PreferencesResponse {
  const enabled = toChannelSet(row);
  const parsed = PreferencesBody.parse({
    channels: {
      email: enabled.has('email'),
      whatsapp: enabled.has('whatsapp'),
    },
    quietHoursStart: (row?.quiet_hours_start as string | null) ?? null,
    quietHoursEnd: (row?.quiet_hours_end as string | null) ?? null,
    timezone: row?.timezone ?? profile?.timezone ?? undefined,
  });

  const email = profile?.email ? profile.email.trim() : null;
  const phone = profile?.phone ? profile.phone.trim() : null;
  const phoneVerified = profile?.phone_verified === null ? false : Boolean(profile?.phone_verified);

  return {
    ...parsed,
    email: email && email.length > 0 ? email : null,
    emailOptIn: parsed.channels.email,
    whatsappOptIn: parsed.channels.whatsapp,
    smsOptIn: false,
    phone: phone && phone.length > 0 ? phone : null,
    phoneVerified,
  };
}

async function loadPreferences(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
): Promise<PreferencesResponse> {
  const [prefRes, profileRes] = await Promise.all([
    supabase
      .from('notifications_opt_in')
      .select(
        'user_id, channels, email_opt_in, wa_opt_in, quiet_hours_start, quiet_hours_end, timezone',
      )
      .eq('user_id', userId)
      .maybeSingle<PreferencesRow>(),
    supabase
      .from('profiles')
      .select('user_id, email, phone, phone_verified, timezone')
      .eq('user_id', userId)
      .maybeSingle<ProfileContact>(),
  ]);

  if (prefRes.error) {
    throw prefRes.error;
  }

  if (profileRes.error && profileRes.error.code !== 'PGRST116') {
    throw profileRes.error;
  }

  return buildResponse(prefRes.data ?? null, profileRes.data ?? null);
}

function normaliseTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildChannelsArray(channels: Record<NotificationChannel, boolean>): NotificationChannel[] {
  const next: NotificationChannel[] = [];
  (Object.entries(channels) as [NotificationChannel, boolean][]).forEach(([key, enabled]) => {
    if (enabled && Channel.options.includes(key)) {
      next.push(key);
    }
  });
  return next;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const preferences = await loadPreferences(supabase, user.id);
      return res.status(200).json({ preferences });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preferences';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    const parsed = PreferencesBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const body = parsed.data;

    const recordChannels: Record<NotificationChannel, boolean> = {
      email: body.channels.email ?? false,
      whatsapp: body.channels.whatsapp ?? false,
    };

    const upsertPayload = {
      user_id: user.id,
      channels: buildChannelsArray(recordChannels),
      email_opt_in: recordChannels.email,
      wa_opt_in: recordChannels.whatsapp,
      quiet_hours_start: normaliseTime(body.quietHoursStart ?? null),
      quiet_hours_end: normaliseTime(body.quietHoursEnd ?? null),
      timezone: body.timezone ?? 'UTC',
    } satisfies Partial<PreferencesRow> & { user_id: string };

    const { error: upsertError } = await supabase
      .from('notifications_opt_in')
      .upsert(upsertPayload, { onConflict: 'user_id' });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    try {
      const preferences = await loadPreferences(supabase, user.id);
      return res.status(200).json({ preferences });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preferences';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
