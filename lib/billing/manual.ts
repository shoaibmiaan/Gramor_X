import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PLANS, getPlanBillingAmount, type PlanKey, type Cycle } from '@/lib/pricing';

export function priceCents(plan: PlanKey, cycle: Cycle): number {
  const major = getPlanBillingAmount(plan, cycle);
  // Stripe will also use 2dp for USD; if you ever support JPY, handle 0dp separately.
  return Math.round(major * 100);
}

export async function createPendingPayment(opts: {
  userId: string;
  email?: string | null;
  plan: PlanKey;
  cycle: Cycle;
  name?: string;
  phone?: string;
  note?: string;
}) {
  const amount_cents = priceCents(opts.plan, opts.cycle);
  const currency = (PLANS[opts.plan].currency || 'USD').toUpperCase();

  // 1) Add a pending due
  const { error: insErr } = await supabaseAdmin
    .from('pending_payments')
    .insert({
      user_id: opts.userId,
      plan_key: opts.plan,
      cycle: opts.cycle,
      currency,
      amount_cents,
      status: 'due',
      note: opts.note ?? null,
      contact_name: opts.name ?? null,
      contact_phone: opts.phone ?? null,
      email: opts.email ?? null,
    });
  if (insErr) throw insErr;

  // 2) Provision plan immediately
  const { error: updErr } = await supabaseAdmin
    .from('profiles')
    .update({ plan_id: opts.plan })
    .eq('id', opts.userId);
  if (updErr) throw updErr;

  return { amount_cents, currency };
}
