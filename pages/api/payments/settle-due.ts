import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';

const Body = z.object({
  intent_id: z.string().uuid().optional(), // if omitted, pick latest pending for this user
});

async function recordEvent(supabase: ReturnType<typeof getServerClient>, userId: string, intentId: string, event: string, payload: unknown) {
  await supabase.from('payment_intent_events').insert([{
    intent_id: intentId,
    user_id: userId,
    event,
    payload: payload as any,
  }]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_body', details: parse.error.flatten() });

  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  if (!stripe) {
    return res.status(503).json({ error: 'stripe_not_configured' });
  }

  // 1) Load the target intent (must belong to this user)
  let intentRow:
    | { id: string; user_id: string; amount_cents: number; currency: string; provider: string; metadata: any }
    | null = null;

  if (parse.data.intent_id) {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('id, user_id, amount_cents, currency, provider, metadata')
      .eq('id', parse.data.intent_id)
      .eq('user_id', user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'intent_not_found' });
    intentRow = data;
  } else {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('id, user_id, amount_cents, currency, provider, metadata')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return res.status(404).json({ error: 'no_pending_intent' });
    intentRow = data;
  }

  // 2) Must have a vault reference
  const vaultId = intentRow.metadata?.vault_id as string | undefined;
  if (!vaultId) {
    await recordEvent(supabase, user.id, intentRow.id, 'charge_skipped', { reason: 'missing_vault_id' });
    return res.status(400).json({ error: 'missing_vault_id' });
  }

  // 3) Load vaulted method (RLS enforces ownership)
  const { data: vault, error: vErr } = await supabase
    .from('payment_methods_vault')
    .select('id, provider, customer_id, payment_method_id, status')
    .eq('id', vaultId)
    .single();

  if (vErr || !vault) return res.status(404).json({ error: 'vault_not_found' });
  if (vault.provider !== 'stripe') return res.status(400).json({ error: 'unsupported_provider' });

  // 4) Attempt off-session charge
  const amount = intentRow.amount_cents;
  const currency = intentRow.currency.toLowerCase();

  // bump attempt counters
  await supabase
    .from('payment_intents')
    .update({ attempt_count: (undefined as any), last_attempt_at: new Date().toISOString() })
    .eq('id', intentRow.id);
  // Note: we don’t read-modify-write for attempt_count to avoid race; if you want, use RPC to atomically increment.

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: vault.customer_id,
      payment_method: vault.payment_method_id,
      off_session: true,
      confirm: true,
      metadata: { gramorx_intent_id: intentRow.id, gramorx_vault_id: vault.id },
      description: 'GramorX pending settlement',
    });

    if (pi.status === 'succeeded') {
      await supabase
        .from('payment_intents')
        .update({ status: 'succeeded', confirmed_at: new Date().toISOString(), failure_code: null, failure_message: null })
        .eq('id', intentRow.id);

      await recordEvent(supabase, user.id, intentRow.id, 'payment_succeeded', pi);
      return res.status(200).json({ ok: true, status: 'succeeded' });
    }

    if (pi.status === 'requires_action') {
      // User must authenticate on-session
      await supabase
        .from('payment_intents')
        .update({ status: 'requires_action' })
        .eq('id', intentRow.id);

      await recordEvent(supabase, user.id, intentRow.id, 'requires_action', { client_secret: pi.client_secret, next_action: pi.next_action });
      return res.status(200).json({
        ok: true,
        status: 'requires_action',
        client_secret: pi.client_secret,
        next_action: pi.next_action,
      });
    }

    // processing / other states
    await supabase
      .from('payment_intents')
      .update({ status: pi.status })
      .eq('id', intentRow.id);

    await recordEvent(supabase, user.id, intentRow.id, 'payment_processing', pi);
    return res.status(200).json({ ok: true, status: pi.status });
  } catch (e: any) {
    const details = { type: e?.type, code: e?.code, message: e?.message };
    await supabase
      .from('payment_intents')
      .update({ status: 'failed', failure_code: e?.code ?? null, failure_message: e?.message ?? null })
      .eq('id', intentRow.id);
    await recordEvent(supabase, user.id, intentRow.id, 'payment_failed', { error: details });

    return res.status(500).json({ error: 'charge_failed', details: e?.message });
  }
}
