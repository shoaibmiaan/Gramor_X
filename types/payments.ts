// types/payments.ts
export type PlanKey = 'starter' | 'booster' | 'master';
export const CANONICAL_CYCLES = ['monthly', 'annual'] as const;
export type Cycle = (typeof CANONICAL_CYCLES)[number];
export type CycleInput = Cycle | 'yearly';

export function normalizeCycleInput(input?: string | null): Cycle {
  const value = (input ?? 'monthly').toLowerCase();
  if (value === 'annual' || value === 'yearly') return 'annual';
  return 'monthly';
}
export type PaymentMethod = 'stripe' | 'easypaisa' | 'jazzcash' | 'safepay' | 'crypto';

export type CreateCheckoutBody = Readonly<{
  plan: PlanKey;
  referralCode?: string;
  billingCycle?: Cycle;
  promoCode?: string;
}>;

export type CreateCheckoutResponse =
  | Readonly<{ ok: true; provider: PaymentMethod; url: string; sessionId?: string | null }>
  | Readonly<{ ok: true; manual: true; message: string }>
  | Readonly<{ ok: false; error: string }>;

export type Invoice = Readonly<{
  id: string;
  amount: number; // minor units
  currency: string;
  createdAt: string; // ISO
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
}>;

export type SubscriptionSummary = Readonly<{
  plan: 'starter' | 'booster' | 'master' | 'free';
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due';
  renewsAt?: string;
  trialEndsAt?: string;
}>;
