import { PLANS, type PlanKey, type Cycle } from '@/lib/pricing';
import { applyPinOrManualProvisioning, getPlanPricing } from '@/lib/subscription';

export function priceCents(plan: PlanKey, cycle: Cycle): number {
  const pricing = getPlanPricing(plan);
  return cycle === 'monthly' ? pricing.monthlyCents : pricing.annualCents;
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
