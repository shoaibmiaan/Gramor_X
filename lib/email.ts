import { env } from '@/lib/env';

type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string; mimetype?: string }[];
};

export async function sendTransactionalEmail({ to, subject, text, html, attachments }: SendEmailOptions) {
  const apiKey = env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  const from = env.RESEND_FROM_EMAIL ?? 'GramorX <no-reply@gramorx.com>';

  if (!apiKey) {
    return { sent: false, reason: 'missing_api_key' as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, html, attachments }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }

  return { sent: true as const };
}
