import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { getServerClient } from '@/lib/supabaseServer';

const MAX_BATCH = 20;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (req.headers['x-cron-secret'] !== process.env.PAYMENTS_CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' });

  const supabase = getServerClient(req, res);

  // Pull a small batch of pending intents (global)
  const { data: intents, error } = await supabase
    .from('payment_intents')
    .select('id, user_id, amount_cents, currency, metadata')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH);

  if (error) return res.status(500).json({ error: 'list_failed' });
  if (!intents?.length) return res.status(200).json({ ok: true, processed: 0 });

  const results: any[] = [];

  for (const intent of intents) {
    try {
      const { data: vault } = await supabase
        .from('payment_methods_vault')
        .select('id, provider, customer_id, payment_method_id')
        .eq('id', intent.metadata?.vault_id ?? '__missing__')
        .single();

      if (!vault || vault.provider !== 'stripe') {
        await supabase.from('payment_intent_events').insert([{ intent_id: intent.id, user_id: intent.user_id, event: 'charge_skipped', payload: { reason: 'bad_vault' } }]);
        results.push({ intent: intent.id, status: 'skipped' });
        continue;
      }

      const pi = await stripe.paymentIntents.create({
        amount: intent.amount_cents,
        currency: (intent.currency || 'usd').toLowerCase(),
        customer: vault.customer_id,
        payment_method: vault.payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { gramorx_intent_id: intent.id, gramorx_vault_id: vault.id },
        description: 'GramorX scheduled settlement',
      });

      if (pi.status === 'succeeded') {
        await supabase.from('payment_intents').update({ status: 'succeeded', confirmed_at: new Date().toISOString() }).eq('id', intent.id);
        await supabase.from('payment_intent_events').insert([{ intent_id: intent.id, user_id: intent.user_id, event: 'payment_succeeded', payload: pi as any }]);
        results.push({ intent: intent.id, status: 'succeeded' });
      } else if (pi.status === 'requires_action') {
        await supabase.from('payment_intents').update({ status: 'requires_action' }).eq('id', intent.id);
        await supabase.from('payment_intent_events').insert([{ intent_id: intent.id, user_id: intent.user_id, event: 'requires_action', payload: { client_secret: pi.client_secret, next_action: pi.next_action } }]);
        results.push({ intent: intent.id, status: 'requires_action' });
      } else {
        await supabase.from('payment_intents').update({ status: pi.status }).eq('id', intent.id);
        await supabase.from('payment_intent_events').insert([{ intent_id: intent.id, user_id: intent.user_id, event: 'payment_processing', payload: pi as any }]);
        results.push({ intent: intent.id, status: pi.status });
      }
    } catch (e: any) {
      await supabase.from('payment_intents').update({ status: 'failed', failure_code: e?.code ?? null, failure_message: e?.message ?? null }).eq('id', intent.id);
      await supabase.from('payment_intent_events').insert([{ intent_id: intent.id, user_id: intent.user_id, event: 'payment_failed', payload: { error: { type: e?.type, code: e?.code, message: e?.message } } }]);
      results.push({ intent: intent.id, status: 'failed' });
    }
  }

  return res.status(200).json({ ok: true, processed: results.length, results });
}
