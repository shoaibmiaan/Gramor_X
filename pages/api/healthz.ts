import type { NextApiHandler } from 'next';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';

type HealthResponse = {
  ok: boolean;
  env: {
    supabase: boolean;
    ga4: boolean;
    meta: boolean;
    sentry: boolean;
    twilio: boolean;
    email_configured: boolean;
    whatsapp_configured: boolean;
  };
  flags: Record<string, boolean>;
  ts: string;
};

function isEmailConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL;
  return Boolean(host && port && user && pass && from);
}

function isWhatsAppConfigured(): boolean {
  const bypass = process.env.TWILIO_BYPASS;
  if (bypass === '1' || bypass === 'true') {
    return false;
  }
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
}

const handler: NextApiHandler<HealthResponse> = (_req, res) => {
  const body: HealthResponse = {
    ok: true,
    env: {
      supabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      ga4: Boolean(env.NEXT_PUBLIC_GA4_ID),
      meta: Boolean(env.NEXT_PUBLIC_META_PIXEL_ID),
      sentry: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
      twilio: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID),
      email_configured: isEmailConfigured(),
      whatsapp_configured: isWhatsAppConfigured(),
    },
    flags: flags.snapshot(),
    ts: new Date().toISOString(),
  };
  res.status(200).json(body);
};

export default handler;
