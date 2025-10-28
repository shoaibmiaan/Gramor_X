// lib/payments/index.ts
import type { CreateCheckoutBody, CreateCheckoutResponse, PaymentMethod, PlanKey } from '@/types/payments';

export const PLAN_LABEL: Record<PlanKey, string> = {
  starter: 'Seedling',
  booster: 'Rocket',
  master: 'Owl',
};

export async function startCheckout(
  method: PaymentMethod,
  body: CreateCheckoutBody,
): Promise<CreateCheckoutResponse> {
  const payload = {
    plan: body.plan,
    referralCode: body.referralCode,
    cycle: body.billingCycle,
    billingCycle: body.billingCycle,
    provider: method,
    promoCode: body.promoCode,
  };
  const res = await fetch('/api/payments/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as CreateCheckoutResponse;
}
