import { supabaseService } from '@/lib/supabaseService';
import { trackor } from '@/lib/analytics/trackor.server';
import { queueNotificationEvent, getNotificationContact } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';
import type { PaymentProvider } from '@/lib/payments/gateway';

type IntentRow = {
  id: string;
  user_id: string | null;
  plan_id: string;
  cycle: string;
  status: string;
};

export type FinalizePaymentResult =
  | { ok: true; intent: IntentRow; alreadyProcessed: boolean }
  | { ok: false; error: 'intent_not_found'; status: 404 }
  | { ok: false; error: 'update_failed'; status: 500 };

export async function finalizeLocalPayment(
  provider: PaymentProvider,
  sessionId: string,
): Promise<FinalizePaymentResult> {
  const { data: intent } = await supabaseService
    .from('payment_intents')
    .select('id, user_id, plan_id, cycle, status')
    .eq('provider', provider)
    .eq('gateway_session_id', sessionId)
    .maybeSingle();

  if (!intent) {
    return { ok: false, error: 'intent_not_found', status: 404 };
  }

  if (intent.status === 'succeeded') {
    return { ok: true, intent, alreadyProcessed: true };
  }

  const confirmedAt = new Date().toISOString();

  const updateResult = await supabaseService
    .from('payment_intents')
    .update({ status: 'succeeded', confirmed_at: confirmedAt, updated_at: confirmedAt })
    .eq('id', intent.id);

  if (updateResult.error) {
    return { ok: false, error: 'update_failed', status: 500 };
  }

  await supabaseService.from('payment_intent_events').insert({
    intent_id: intent.id,
    user_id: intent.user_id,
    event: 'webhook.success',
    payload: { provider, sessionId },
  });

  if (intent.user_id) {
    await supabaseService.from('profiles').update({ plan_id: intent.plan_id }).eq('id', intent.user_id);
  }

  await trackor.log('payments.intent.success', {
    userId: intent.user_id,
    intentId: intent.id,
    provider,
    plan: intent.plan_id,
    cycle: intent.cycle,
  });

  if (intent.user_id) {
    const contact = await getNotificationContact(intent.user_id);
    if (contact.email) {
      const baseUrl = getBaseUrl();
      const payload: Record<string, unknown> = {
        plan: intent.plan_id,
        cycle: intent.cycle,
        provider,
        deep_link: `${baseUrl}/settings/billing`,
        user_email: contact.email,
      };
      if (contact.phone) {
        payload.user_phone = contact.phone;
      }

      const result = await queueNotificationEvent({
        event_key: 'payment_success',
        user_id: intent.user_id,
        payload,
        channels: ['email'],
        idempotency_key: `payment_success:${intent.id}`,
      });

      if (!result.ok && result.reason !== 'duplicate') {
        console.error('[payments:webhook:notify]', provider, result.message);
      }
    }
  }

  return { ok: true, intent, alreadyProcessed: false };
}
