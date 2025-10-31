// pages/api/payments/create-intent.ts
import type { NextApiHandler, NextApiRequest } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';
import { trackor } from '@/lib/analytics/trackor.server';
import { createGatewayIntent, amountInCents, type PaymentProvider } from '@/lib/payments/gateway';
import { createPendingPayment } from '@/lib/billing/manual';
import type { Cycle, PlanKey } from '@/lib/pricing';
import { queueNotificationEvent, getNotificationContact, type NotificationContact } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';

const providers: PaymentProvider[] = ['stripe', 'easypaisa', 'jazzcash', 'crypto'];

const Body = z.object({
  plan: z.enum(['starter', 'booster', 'master']).default('booster'),
  cycle: z.enum(['monthly', 'annual']).optional(),
  // Back-compat for old client param name
  billingCycle: z.enum(['monthly', 'annual']).optional(),
  provider: z.enum(providers as [PaymentProvider, ...PaymentProvider[]]).optional(),
  referralCode: z.string().max(64).optional(),
  promoCode: z.string().max(64).optional(),
});

const getOrigin = (req: NextApiRequest) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
};

// Provider → default currency map (expand later if you add multi-currency prices)
const PROVIDER_DEFAULT_CURRENCY: Record<PaymentProvider, 'USD' | 'PKR'> = {
  stripe: 'USD',
  easypaisa: 'PKR',
  jazzcash: 'PKR',
  crypto: 'USD',
};

type SuccessRedirect = Readonly<{ ok: true; provider: PaymentProvider; url: string; sessionId?: string | null }>;
type SuccessManual = Readonly<{ ok: true; manual: true; message: string }>;
type Failure = Readonly<{ ok: false; error: string; details?: unknown }>;
type ResBody = SuccessRedirect | SuccessManual | Failure;

const handler: NextApiHandler<ResBody> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  // Validate input strictly
  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid body', details: parsed.error.flatten() });
  }

  const body = parsed.data;
  const plan: PlanKey = body.plan;
  const cycle: Cycle = (body.cycle ?? body.billingCycle ?? 'monthly') as Cycle;
  const provider: PaymentProvider = (body.provider ?? 'stripe') as PaymentProvider;
  const referralCode = body.referralCode;
  const promoCode = body.promoCode;

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  const userEmail = auth.user?.email ?? null;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const origin = getOrigin(req);
  const baseUrl = getBaseUrl();

  // Choose currency by provider (don’t accept arbitrary currency from client)
  const currency = PROVIDER_DEFAULT_CURRENCY[provider];

  // Price sanity
  const amountCents = amountInCents(plan, cycle);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return res.status(400).json({ ok: false, error: 'invalid_amount' });
  }

  // Create DB intent first (traceability & idempotency)
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
      metadata: { referralCode, promoCode },
    })
    .select('id')
    .single();

  if (insertErr || !intentRow) {
    console.error('[payments] insert payment_intents failed', insertErr);
    return res.status(500).json({ ok: false, error: 'intent_create_failed', details: insertErr?.message ?? insertErr });
  }

  const intentId = intentRow.id as string;
  const nowIso = new Date().toISOString();

  let contactPromise: Promise<NotificationContact> | null = null;
  const ensureContact = () => (contactPromise ??= getNotificationContact(userId));

  const notify = async (eventKey: 'payment_success' | 'payment_failed', reason?: string) => {
    const contact = await ensureContact();
    if (!contact.email) return;

    const payload: Record<string, unknown> = {
      plan,
      cycle,
      provider,
      deep_link: `${baseUrl}/settings/billing`,
      user_email: contact.email,
    };
    if (contact.phone) payload.user_phone = contact.phone;
    if (reason) payload.reason = reason;

    const result = await queueNotificationEvent({
      event_key: eventKey,
      user_id: userId,
      payload,
      channels: ['email'],
      idempotency_key: `${eventKey}:${intentId}`,
    });
    if (!result.ok && result.reason !== 'duplicate') {
      console.error('[payments:notify]', eventKey, result.message);
    }
  };

  await supabaseService.from('payment_intent_events').insert({
    intent_id: intentId,
    user_id: userId,
    event: 'created',
    payload: { provider, plan, cycle, referralCode, promoCode, currency, amount_cents: amountCents },
  });

  await trackor.log('payments.intent.create', { userId, intentId, provider, plan, cycle, currency, amountCents });

  try {
    // Create the gateway intent/session
    // NOTE: If the gateway type hasn’t been updated to accept `currency`, add it there.
    // Using @ts-expect-error per your rules, with a TODO.
    // @ts-expect-error TODO(codex): extend createGatewayIntent options to include `currency`
    const gateway = await createGatewayIntent({
      provider,
      plan,
      cycle,
      origin,
      userId,
      referralCode,
      promoCode,
      amountCents,
      currency, // <- important for Stripe (and future multi-currency support)
      intentId,
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
      payload: { url: gateway.url, sessionId: gateway.sessionId ?? null, promoCode, currency },
    });

    return res.status(200).json({ ok: true, provider, url: gateway.url, sessionId: gateway.sessionId ?? null });
  } catch (error) {
    const message = (error as Error)?.message || 'gateway_error';

    // If Stripe is not configured, fall back to manual activation (your existing path)
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
            metadata: { referralCode, promoCode, manual: true },
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

        await notify('payment_success');

        return res.status(200).json({
          ok: true,
          manual: true,
          message: 'Subscription activated. Your payment will be collected offline and has been marked as due.',
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

        await notify('payment_failed', (manualErr as Error).message);
        return res.status(500).json({ ok: false, error: 'manual_fallback_failed' });
      }
    }

    // Regular gateway failure
    console.error('[payments] gateway error', { provider, message, plan, cycle, currency });
    await supabaseService
      .from('payment_intents')
      .update({ status: 'failed', failure_message: message, updated_at: new Date().toISOString() })
      .eq('id', intentId);

    await supabaseService.from('payment_intent_events').insert({
      intent_id: intentId,
      user_id: userId,
      event: 'gateway.error',
      payload: { message, provider, currency },
    });

    await notify('payment_failed', message);
    return res.status(500).json({ ok: false, error: message });
  }
};

export default handler;
