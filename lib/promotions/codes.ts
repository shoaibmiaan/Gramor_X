import { PLAN_LABEL } from '@/lib/payments/index';
import type { Cycle, PlanKey } from '@/types/payments';
import type { PaymentMethod } from '@/types/payments';

export type PromoCodeRule = Readonly<{
  code: string;
  label: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  appliesTo?: Readonly<{
    plans?: PlanKey[];
    cycles?: Cycle[];
    methods?: PaymentMethod[];
  }>;
  stackableWithReferral?: boolean;
  notes?: string;
}>;

export type PromoEligibilityContext = Readonly<{
  plan?: PlanKey;
  cycle?: Cycle;
  method?: PaymentMethod;
}>;

export const PROMO_CODES: readonly PromoCodeRule[] = [
  {
    code: 'PROMO10',
    label: 'Welcome 10% off',
    description: 'Take 10% off your first payment on any plan.',
    type: 'percent',
    value: 10,
    notes: 'Applies to the first charge only. Stackable with referrals.',
    stackableWithReferral: true,
  },
  {
    code: 'GRAMOR25',
    label: '$25 off annual plans',
    description: 'Save $25 instantly when you choose annual billing.',
    type: 'flat',
    value: 2500,
    appliesTo: { cycles: ['annual'] },
    notes: 'Best for Rocket and Owl plans on annual billing.',
  },
  {
    code: 'CRYPTO15',
    label: '15% off with crypto',
    description: 'Unlock 15% off when you complete payment with crypto.',
    type: 'percent',
    value: 15,
    appliesTo: { methods: ['crypto'] },
    notes: 'Discount will be verified when remittance proof is reviewed.',
  },
] as const;

const PROMO_MAP = PROMO_CODES.reduce<Record<string, PromoCodeRule>>((acc, rule) => {
  acc[rule.code] = rule;
  return acc;
}, {});

export const normalizePromoCode = (value: string): string => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export const findPromoByCode = (code?: string | null): PromoCodeRule | null => {
  if (!code) return null;
  const normalized = normalizePromoCode(code);
  return PROMO_MAP[normalized] ?? null;
};

export const computePromoDiscount = (rule: PromoCodeRule, amountCents: number): number => {
  if (amountCents <= 0) return 0;
  if (rule.type === 'flat') {
    return Math.min(amountCents, Math.max(0, Math.round(rule.value)));
  }
  return Math.min(amountCents, Math.round((amountCents * rule.value) / 100));
};

export const explainPromoRule = (rule: PromoCodeRule): string => {
  const parts: string[] = [rule.description];
  if (rule.appliesTo?.plans && rule.appliesTo.plans.length > 0) {
    const planLabels = rule.appliesTo.plans.map((plan) => PLAN_LABEL[plan]).join(', ');
    parts.push(`Eligible plans: ${planLabels}.`);
  }
  if (rule.appliesTo?.cycles && rule.appliesTo.cycles.length > 0) {
    const cycleLabels = rule.appliesTo.cycles.map((cycle) => (cycle === 'annual' ? 'Annual billing' : 'Monthly billing'));
    parts.push(`Eligible billing: ${cycleLabels.join(', ')}.`);
  }
  if (rule.appliesTo?.methods && rule.appliesTo.methods.length > 0) {
    const methodNames = rule.appliesTo.methods
      .map((method) => (method === 'stripe' ? 'Card' : method === 'crypto' ? 'Crypto' : method))
      .join(', ');
    parts.push(`Use with: ${methodNames}.`);
  }
  if (rule.notes) {
    parts.push(rule.notes);
  }
  return parts.join(' ');
};

export const checkPromoEligibility = (
  rule: PromoCodeRule,
  context: PromoEligibilityContext,
): { ok: true } | { ok: false; reason: string } => {
  if (rule.appliesTo?.plans && context.plan && !rule.appliesTo.plans.includes(context.plan)) {
    const allowed = rule.appliesTo.plans.map((plan) => PLAN_LABEL[plan]).join(', ');
    return { ok: false, reason: `Available for ${allowed} plans.` };
  }
  if (rule.appliesTo?.cycles && context.cycle && !rule.appliesTo.cycles.includes(context.cycle)) {
    const allowed = rule.appliesTo.cycles.map((cycle) => (cycle === 'annual' ? 'annual billing' : 'monthly billing')).join(', ');
    return { ok: false, reason: `Choose ${allowed} to use this promo.` };
  }
  if (rule.appliesTo?.methods && context.method && !rule.appliesTo.methods.includes(context.method)) {
    const allowed = rule.appliesTo.methods
      .map((method) => (method === 'stripe' ? 'card payments' : method))
      .join(', ');
    return { ok: false, reason: `Switch to ${allowed} to apply this promo.` };
  }
  return { ok: true };
};
