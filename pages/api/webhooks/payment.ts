// pages/api/webhooks/payment.ts
import type { NextApiHandler } from 'next';
import { buffer } from 'micro';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { env } from '@/lib/env';
import { trackor } from '@/lib/analytics/trackor.server';
import { queueNotificationEvent, getNotificationContact } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';

// Important: disable body parsing so we can verify Stripe signatures
export const config = { api: { bodyParser: false } };

type Ok = { received: true };
type Err = { error: string };

const handler: NextApiHandler<Ok | Err> = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // @ts-expect-error TODO: add `stripe` dependency for full types
  const Stripe = (await import('stripe')).default ?? (await import('stripe'));
  const secretKey = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  const supabase = createSupabaseServerClient({ serviceRole: true });
  const baseUrl = getBaseUrl();

  const notifyPayment = async (
    userId: string | null | undefined,
    eventKey: 'payment_success' | 'payment_failed',
    id: string,
    extras: Record<string, unknown> = {},
  ) => {
    if (!userId) return;
    const contact = await getNotificationContact(userId);
    if (!contact.email) return;

    const payload: Record<string, unknown> = {
      deep_link: `${baseUrl}/settings/billing`,
      user_email: contact.email,
      ...extras,
    };

    if (contact.phone) {
      payload.user_phone = contact.phone;
    }

    const result = await queueNotificationEvent({
      event_key: eventKey,
      user_id: userId,
      payload,
      channels: ['email'],
      idempotency_key: `${eventKey}:${id}`,
    });

    if (!result.ok && result.reason !== 'duplicate') {
      console.error('[payments:notify]', eventKey, result.message);
    }
  };

  // If Stripe not configured, accept as no-op (useful when testing local gateways)
  if (!secretKey || !webhookSecret) {
    return res.status(200).json({ received: true });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

  let event: any;
  try {
    const sig = req.headers['stripe-signature'] as string;
    const raw = await buffer(req);
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed` });
  }

  try {
    // Persist raw event for audit
    try {
      await supabase.from('payment_events').insert([
        {
          provider: 'stripe',
          status: 'webhook_received',
          external_id: event.id,
          metadata: { type: event.type },
        },
      ]);
    } catch {
      /* non-fatal */
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string;
          client_reference_id?: string; // userId
          metadata?: Record<string, string>;
          subscription?: string;
          customer?: string;
        };

        const userId = session.client_reference_id;
        const plan = (session.metadata?.plan as 'starter' | 'booster' | 'master' | undefined) || 'booster';

        if (userId) {
          // Update profile entitlements
          await supabase
            .from('profiles')
            .update({
              membership: plan,
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              subscription_renews_at: null,
              trial_ends_at: null,
              premium_until: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }

        if (session.id) {
          const { data: intent } = await supabase
            .from('payment_intents')
            .select('id, user_id, plan_id, cycle')
            .eq('gateway_session_id', session.id)
            .eq('provider', 'stripe')
            .maybeSingle();

          if (intent) {
            const confirmedAt = new Date().toISOString();
            await supabase
              .from('payment_intents')
              .update({ status: 'succeeded', confirmed_at: confirmedAt, updated_at: confirmedAt })
              .eq('id', intent.id);

            await supabase.from('payment_intent_events').insert({
              intent_id: intent.id,
              user_id: intent.user_id,
              event: 'webhook.success',
              payload: { provider: 'stripe', sessionId: session.id },
            });

            await trackor.log('payments.intent.success', {
              userId: intent.user_id ?? userId,
              intentId: intent.id,
              provider: 'stripe',
              plan: intent.plan_id ?? plan,
              cycle: intent.cycle,
            });
          }
        }

        await supabase.from('payment_events').insert([
          {
            provider: 'stripe',
            status: 'checkout.session.completed',
            external_id: session.id,
            user_id: userId,
            metadata: { plan, subscription: session.subscription, customer: session.customer },
          },
        ]);

        await notifyPayment(userId, 'payment_success', intent?.id ?? session.id, {
          provider: 'stripe',
          plan: intent?.plan_id ?? plan,
          cycle: intent?.cycle ?? 'monthly',
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        await supabase.from('payment_events').insert([
          {
            provider: 'stripe',
            status: 'invoice.payment_succeeded',
            external_id: invoice.id,
            user_id: null,
            metadata: { amount_paid: invoice.amount_paid, currency: invoice.currency },
          },
        ]);

        if (invoice.customer) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('stripe_customer_id', invoice.customer as string)
            .maybeSingle<{ user_id: string }>();

          await notifyPayment(profile?.user_id ?? null, 'payment_success', invoice.id, {
            provider: 'stripe',
            amount: invoice.amount_paid,
            currency: invoice.currency,
            invoice_id: invoice.id,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;

        await supabase.from('payment_events').insert([
          {
            provider: 'stripe',
            status: 'invoice.payment_failed',
            external_id: invoice.id,
            user_id: null,
            metadata: { amount_due: invoice.amount_due, currency: invoice.currency },
          },
        ]);

        if (invoice.customer) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('stripe_customer_id', invoice.customer as string)
            .maybeSingle<{ user_id: string }>();

          const reason =
            (invoice.last_payment_error?.message as string | undefined) ??
            'Payment failed';

          await notifyPayment(profile?.user_id ?? null, 'payment_failed', invoice.id, {
            provider: 'stripe',
            amount: invoice.amount_due,
            currency: invoice.currency,
            reason,
            invoice_id: invoice.id,
          });
        }

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        // Best-effort: if you store customer->user mapping, update profile
        try {
          const customerId: string | undefined = sub.customer;
          if (customerId) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('id, membership')
              .eq('stripe_customer_id', customerId)
              .maybeSingle();
            if (prof?.id) {
              const status = (sub.status as string | undefined) || 'canceled';
              const periodEnd =
                typeof sub.current_period_end === 'number'
                  ? new Date(sub.current_period_end * 1000).toISOString()
                  : null;
              const trialEnd =
                typeof sub.trial_end === 'number'
                  ? new Date(sub.trial_end * 1000).toISOString()
                  : null;

              const shouldDowngrade =
                status === 'canceled' || status === 'past_due' || status === 'unpaid';

              const updates: Record<string, any> = {
                subscription_status: status,
                subscription_renews_at: periodEnd,
                trial_ends_at: trialEnd,
                updated_at: new Date().toISOString(),
              };

              if (shouldDowngrade) {
                updates.membership = 'free';
                updates.premium_until = null;
              }

              await supabase
                .from('profiles')
                .update(updates)
                .eq('id', prof.id);
            }
          }
        } catch {
          /* non-fatal */
        }
        await supabase.from('payment_events').insert([
          {
            provider: 'stripe',
            status: event.type,
            external_id: sub.id,
            user_id: null,
            metadata: { status: sub.status, current_period_end: sub.current_period_end },
          },
        ]);
        break;
      }

      default:
        // Store unknowns for visibility
        await supabase.from('payment_events').insert([
          {
            provider: 'stripe',
            status: 'unhandled_event',
            external_id: event.id,
            metadata: { type: event.type },
          },
        ]);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message || 'Webhook handler error' });
  }
};

export default handler;
