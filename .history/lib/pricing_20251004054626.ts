// lib/pricing.ts
export type PlanId = 'free' | 'pro' | 'elite';

export type BillingCycle = 'monthly' | 'annual';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  // Stripe price IDs (set real IDs in env or here)
  stripe?: {
    monthly?: string;
    annual?: string;
  };
  // Local rails (optional): pass-through for Easypaisa/JazzCash if you keep them
  local?: {
    monthly?: { provider: 'easypaisa' | 'jazzcash'; priceCode: string };
    annual?: { provider: 'easypaisa' | 'jazzcash'; priceCode: string };
  };
  features: {
    library: 'limited' | 'full';
    aiFeedback: 'none' | 'basic' | 'full';
    mockTestsPerMonth: number | 'unlimited';
    analytics: 'none' | 'basic' | 'advanced';
    proctoring: boolean;
    placement: boolean;
    prioritySupport: boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Try IELTS practice with daily limits',
    features: {
      library: 'limited',
      aiFeedback: 'basic',
      mockTestsPerMonth: 0,
      analytics: 'basic',
      proctoring: false,
      placement: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Unlimited practice plus AI feedback',
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_M ?? '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_Y ?? '',
    },
    features: {
      library: 'full',
      aiFeedback: 'full',
      mockTestsPerMonth: 4,
      analytics: 'advanced',
      proctoring: false,
      placement: true,
      prioritySupport: false,
    },
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    tagline: 'Full exam prep with proctoring & unlimited mocks',
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_M ?? '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_Y ?? '',
    },
    features: {
      library: 'full',
      aiFeedback: 'full',
      mockTestsPerMonth: 'unlimited',
      analytics: 'advanced',
      proctoring: true,
      placement: true,
      prioritySupport: true,
    },
  },
};

export function planFromPriceId(priceId?: string | null): PlanId | null {
  if (!priceId) return null;
  for (const p of Object.values(PLANS)) {
    if (p.stripe?.monthly === priceId || p.stripe?.annual === priceId) return p.id;
  }
  return null;
}

const RANK: Record<PlanId, number> = { free: 0, pro: 1, elite: 2 };
export function isAtLeast(user: PlanId, min: PlanId) {
  return RANK[user] >= RANK[min];
}
