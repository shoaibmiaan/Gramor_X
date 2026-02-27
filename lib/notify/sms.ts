import twilio from 'twilio';

import { captureException } from '@/lib/monitoring/sentry';

export interface WhatsAppPayload {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppResult {
  ok: boolean;
  noop?: boolean;
  id?: string;
  error?: string;
}

function resolveCredentials() {
  const bypass = process.env.TWILIO_BYPASS === '1' || process.env.TWILIO_BYPASS === 'true';
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (bypass || !accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber } as const;
}

export async function sendWhatsApp(payload: WhatsAppPayload): Promise<WhatsAppResult> {
  const credentials = resolveCredentials();

  if (!credentials) {
    console.info('[wa:noop]', { to: payload.to });
    return { ok: true, noop: true };
  }

  try {
    const client = twilio(credentials.accountSid, credentials.authToken);
    const message = await client.messages.create({
      from: `whatsapp:${credentials.fromNumber}`,
      to: payload.to.startsWith('whatsapp:') ? payload.to : `whatsapp:${payload.to}`,
      body: payload.body,
      mediaUrl: payload.mediaUrl ? [payload.mediaUrl] : undefined,
    });

    return { ok: true, id: message.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Twilio error';
    console.error('[wa:error]', message);
    captureException(error, { scope: 'notify:whatsapp', to: payload.to });
    return { ok: false, error: message };
  }
}
