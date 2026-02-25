import type { NextApiHandler } from 'next';

import { finalizeLocalPayment } from '@/lib/payments/localWebhook';
import { verifySafepay } from '@/lib/payments/safepay';

export const config = { api: { bodyParser: false } };

async function readBody(req: Parameters<NextApiHandler>[0]): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const raw = await readBody(req);
  const contentType = req.headers['content-type'] ?? '';
  let payload: Record<string, unknown> = {};

  try {
    if (contentType.includes('application/json')) {
      payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } else {
      const params = new URLSearchParams(raw);
      payload = Object.fromEntries(params.entries());
    }
  } catch (error) {
    return res.status(400).json({ ok: false, error: 'invalid_body' });
  }

  let verified = false;
  try {
    verified = await verifySafepay(payload);
  } catch (error) {
    return res.status(400).json({ ok: false, error: 'verification_failed' });
  }

  if (!verified) {
    return res.status(400).json({ ok: false, error: 'invalid_signature' });
  }

  const sessionId = String(
    (payload.tracker ?? payload.beacon ?? payload.token ?? payload.orderId ?? payload.order_id ?? '') || '',
  ).trim();
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'missing_session' });
  }

  const result = await finalizeLocalPayment('safepay', sessionId);
  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }

  const planParam = Array.isArray(req.query.plan) ? req.query.plan[0] : req.query.plan;
  const plan = typeof planParam === 'string' && planParam ? planParam : result.intent.plan_id;
  const successPath = `/checkout/success?session_id=${encodeURIComponent(sessionId)}&plan=${encodeURIComponent(plan)}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(
    `<!DOCTYPE html><html lang="en"><head><meta http-equiv="refresh" content="0;url=${successPath}" /></head><body><p>Payment confirmed. <a href="${successPath}">Continue to GramorX</a>.</p><script>window.location.href='${successPath}';</script></body></html>`,
  );
};

export default handler;
