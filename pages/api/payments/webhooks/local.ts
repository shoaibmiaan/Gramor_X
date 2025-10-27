// pages/api/payments/webhooks/local.ts
import type { NextApiHandler } from 'next';

import { supabaseService } from '@/lib/supabaseService';
import { trackor } from '@/lib/analytics/trackor.server';
import { verifyEasypaisa } from '@/lib/payments/easypaisa';
import { verifyJazzCash } from '@/lib/payments/jazzcash';
import type { PaymentProvider } from '@/lib/payments/gateway';

const providers: PaymentProvider[] = ['stripe', 'easypaisa', 'jazzcash'];
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
    }
  } catch (error) {
    return res.status(400).json({ ok: false, error: 'verification_failed' });
  }

  if (!verified) {
    return res.status(400).json({ ok: false, error: 'invalid_signature' });
  }

  const sessionId = String((req.body as any)?.sessionId ?? (req.body as any)?.orderId ?? '').trim();
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'missing_session' });
  }

  const { data: intent } = await supabaseService
    .from('payment_intents')
    .select('id, user_id, plan_id, cycle, status')
    .eq('provider', provider)
    .eq('gateway_session_id', sessionId)
    .maybeSingle();

  if (!intent) {
    return res.status(404).json({ ok: false, error: 'intent_not_found' });
  }

  if (intent.status === 'succeeded') {
    return res.status(200).json({ ok: true });
  }

  const confirmedAt = new Date().toISOString();

  await supabaseService
    .from('payment_intents')
    .update({ status: 'succeeded', confirmed_at: confirmedAt, updated_at: confirmedAt })
    .eq('id', intent.id);

  await supabaseService.from('payment_intent_events').insert({
    intent_id: intent.id,
    user_id: intent.user_id,
    event: 'webhook.success',
    payload: { provider, sessionId },
  });

  await supabaseService
    .from('profiles')
    .update({ plan_id: intent.plan_id })
    .eq('id', intent.user_id);

  await trackor.log('payments.intent.success', {
    userId: intent.user_id,
    intentId: intent.id,
    provider,
    plan: intent.plan_id,
    cycle: intent.cycle,
  });

  return res.status(200).json({ ok: true });
};

export default handler;
