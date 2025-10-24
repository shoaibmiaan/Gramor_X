// pages/api/payments/create-intent.ts
import type { NextApiHandler, NextApiRequest } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';
import { trackor } from '@/lib/analytics/trackor.server';
import { createGatewayIntent, amountInCents, type PaymentProvider } from '@/lib/payments/gateway';
import { createPendingPayment } from '@/lib/billing/manual';
import type { Cycle, PlanKey } from '@/lib/pricing';

const providers: PaymentProvider[] = ['stripe', 'easypaisa', 'jazzcash'];
const isPlan = (val: unknown): val is PlanKey => typeof val === 'string' && ['starter', 'booster', 'master'].includes(val);
const isCycle = (val: unknown): val is Cycle => typeof val === 'string' && ['monthly', 'annual'].includes(val);
const isProvider = (val: unknown): val is PaymentProvider => typeof val === 'string' && providers.includes(val as PaymentProvider);

const getOrigin = (req: NextApiRequest) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
};

type Body = Readonly<{ plan: PlanKey; cycle?: Cycle; provider?: PaymentProvider; referralCode?: string }>;

type SuccessRedirect = Readonly<{ ok: true; provider: PaymentProvider; url: string; sessionId?: string | null }>;
type SuccessManual = Readonly<{ ok: true; manual: true; message: string }>;
type Failure = Readonly<{ ok: false; error: string }>;
type ResBody = SuccessRedirect | SuccessManual | Failure;

const handler: NextApiHandler<ResBody> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const body = (req.body || {}) as Partial<Body> & { billingCycle?: Cycle };
  const plan = isPlan(body.plan) ? body.plan : 'booster';
  const cycleCandidate = isCycle(body.cycle) ? body.cycle : isCycle(body.billingCycle) ? body.billingCycle : undefined;
  const cycle = cycleCandidate ?? 'monthly';
  const provider = isProvider(body.provider) ? body.provider : 'stripe';
  const referralCode = typeof body.referralCode === 'string' ? body.referralCode.slice(0, 64) : undefined;

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  const userEmail = auth.user?.email ?? null;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const origin = getOrigin(req);
  const amountCents = amountInCents(plan, cycle);
  const currency = 'USD';

  const { data: intentRow, error: insertErr } = await supabaseService
    .from('payment_intents')
    .insert({
      user_id: userId,
      plan_id: plan,
      cycle,
      provider,
      amount_cents: amountCents,
      currency,
      status: 'pending',
      metadata: { referralCode },
    })
    .select('id')
    .single();

  if (insertErr || !intentRow) {
    return res.status(500).json({ ok: false, error: 'intent_create_failed' });
  }

  const intentId = intentRow.id as string;
  const nowIso = new Date().toISOString();

  await supabaseService.from('payment_intent_events').insert({
    intent_id: intentId,
    user_id: userId,
    event: 'created',
    payload: { provider, plan, cycle, referralCode },
  });

  await trackor.log('payments.intent.create', {
    userId,
    intentId,
    provider,
    plan,
    cycle,
  });

  try {
    const gateway = await createGatewayIntent({
      provider,
      plan,
      cycle,
      origin,
      userId,
      referralCode,
    });

    await supabaseService
      .from('payment_intents')
      .update({
        status: provider === 'stripe' ? 'requires_payment_method' : 'pending_confirmation',
        gateway_session_id: gateway.sessionId ?? null,
        updated_at: nowIso,
      })
      .eq('id', intentId);

    await supabaseService.from('payment_intent_events').insert({
      intent_id: intentId,
      user_id: userId,
      event: 'gateway.created',
      payload: { url: gateway.url, sessionId: gateway.sessionId ?? null },
    });

    return res.status(200).json({ ok: true, provider, url: gateway.url, sessionId: gateway.sessionId ?? null });
  } catch (error) {
    const message = (error as Error)?.message || 'gateway_error';

    if (provider === 'stripe' && message === 'Stripe not configured') {
      try {
        const { amount_cents, currency: manualCurrency } = await createPendingPayment({
          userId,
          email: userEmail,
          plan,
          cycle,
          note: 'Manual fallback via /api/payments/create-intent',
        });

        const confirmedAt = new Date().toISOString();

        await supabaseService
          .from('payment_intents')
          .update({
            status: 'manual',
            confirmed_at: confirmedAt,
            updated_at: confirmedAt,
            metadata: { referralCode, manual: true },
          })
          .eq('id', intentId);

        await supabaseService.from('payment_intent_events').insert({
          intent_id: intentId,
          user_id: userId,
          event: 'manual.provisioned',
          payload: { amount_cents, currency: manualCurrency },
        });

        await trackor.log('payments.intent.success', {
          userId,
          intentId,
          provider: 'manual',
          plan,
          cycle,
        });

        return res.status(200).json({
          ok: true,
          manual: true,
          message:
            'Subscription activated. Your payment will be collected offline and has been marked as due.',
        });
      } catch (manualErr) {
        await supabaseService
          .from('payment_intents')
          .update({
            status: 'failed',
            failure_message: (manualErr as Error).message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', intentId);

        await supabaseService.from('payment_intent_events').insert({
          intent_id: intentId,
          user_id: userId,
          event: 'manual.error',
          payload: { message: (manualErr as Error).message },
        });

        return res.status(500).json({ ok: false, error: 'manual_fallback_failed' });
      }
    }

    await supabaseService
      .from('payment_intents')
      .update({ status: 'failed', failure_message: message, updated_at: new Date().toISOString() })
      .eq('id', intentId);

    await supabaseService.from('payment_intent_events').insert({
      intent_id: intentId,
      user_id: userId,
      event: 'gateway.error',
      payload: { message },
    });

    return res.status(500).json({ ok: false, error: message });
  }
};

export default handler;
