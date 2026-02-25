import nodemailer from 'nodemailer';

import { captureException } from '@/lib/monitoring/sentry';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  ok: boolean;
  noop?: boolean;
  id?: string;
  error?: string;
}

function resolveConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME ?? 'GramorX';

  if (!host || !port || !user || !pass || !fromEmail) {
    return null;
  }

  return {
    host,
    port,
    auth: { user, pass },
    from: `${fromName} <${fromEmail}>`,
  } as const;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const config = resolveConfig();

  if (!config) {
    console.info('[email:noop]', { to: payload.to, subject: payload.subject });
    return { ok: true, noop: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.auth,
    });

    const info = await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return { ok: true, id: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    console.error('[email:error]', message);
    captureException(error, { scope: 'notify:email', to: payload.to });
    return { ok: false, error: message };
  }
}
