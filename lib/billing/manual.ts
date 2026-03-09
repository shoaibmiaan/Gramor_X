import { PLANS, getPlanBillingAmount, type PlanKey, type Cycle } from '@/lib/pricing';
import { applyPinOrManualProvisioning } from '@/lib/subscription';

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

  await applyPinOrManualProvisioning({
    userId: opts.userId,
    plan: opts.plan,
    provider: 'manual',
    eventId: `pending-payment:${opts.userId}:${opts.plan}:${opts.cycle}:${amount_cents}`,
    cycle: opts.cycle,
    amountCents: amount_cents,
    email: opts.email ?? null,
    note: opts.note,
  });

  return { amount_cents, currency };
}
