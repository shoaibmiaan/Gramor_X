// pages/api/payments/webhooks/local.ts
import type { NextApiHandler } from 'next';

import { verifyEasypaisa } from '@/lib/payments/easypaisa';
import { verifyJazzCash } from '@/lib/payments/jazzcash';
import { verifySafepay } from '@/lib/payments/safepay';
import type { PaymentProvider } from '@/lib/payments/gateway';
import { finalizeLocalPayment } from '@/lib/payments/localWebhook';

const providers: PaymentProvider[] = ['stripe', 'easypaisa', 'jazzcash', 'safepay'];
const isProvider = (val: unknown): val is PaymentProvider => typeof val === 'string' && providers.includes(val as PaymentProvider);

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const providerParam = Array.isArray(req.query.provider) ? req.query.provider[0] : req.query.provider;
  const provider = isProvider(providerParam)
    ? providerParam
    : isProvider((req.body as any)?.provider)
    ? ((req.body as any).provider as PaymentProvider)
    : null;

  if (!provider || provider === 'stripe') {
    return res.status(400).json({ ok: false, error: 'Unsupported provider' });
  }

  let verified = false;
  try {
    if (provider === 'easypaisa') {
      verified = await verifyEasypaisa(req.body);
    } else if (provider === 'jazzcash') {
      verified = await verifyJazzCash(req.body);
    } else if (provider === 'safepay') {
      verified = await verifySafepay(req.body);
    }
  } catch (error) {
    return res.status(400).json({ ok: false, error: 'verification_failed' });
  }

  if (!verified) {
    return res.status(400).json({ ok: false, error: 'invalid_signature' });
  }

  const sessionId = String(
    (req.body as any)?.sessionId ??
      (req.body as any)?.orderId ??
      (req.body as any)?.tracker ??
      (req.body as any)?.token ??
      '',
  ).trim();
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'missing_session' });
  }

  const result = await finalizeLocalPayment(provider, sessionId);
  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }

  return res.status(200).json({ ok: true, alreadyProcessed: result.alreadyProcessed });
};

export default handler;
