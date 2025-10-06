// lib/pricing.ts
// Three paid plans + "free". USD-first (or any currency via env) with clean formatting.

export type PlanKey = 'starter' | 'booster' | 'master';
export type PlanId = 'free' | PlanKey;
export type Cycle = 'monthly' | 'annual';

export const PLAN_LABEL: Record<PlanKey, string> = {
  starter: 'Seedling 🌱',
  booster: 'Rocket 🚀',
  master:  'Owl 👑',
};

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();
const CURRENCY_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE ?? (CURRENCY === 'USD' ? 'en-US' : 'en');

// UI card data + Stripe price mapping (IDs from env; amounts are **major units** for display)
export type PlanCard = {
  key: PlanKey;
  title: string;
  icon: string;
  badge?: string;
  mostPopular?: boolean;

  currency: string;                // e.g., 'USD'
  displayPriceMonthly: number;     // e.g., 9 (→ $9)
  displayPriceAnnual: number;      // e.g., 8 (show per-month equivalent for annual plan)

  stripe: {
    priceIdMonthly?: string;       // Stripe Price ID (USD/monthly)
    priceIdAnnual?: string;        // Stripe Price ID (USD/annual)
  };
};

// Set your USD price points here (examples)
export const PLANS: Record<PlanKey, PlanCard> = {
  starter: {
    key: 'starter',
    title: 'Seedling',
    icon: 'fa-seedling',
    currency: CURRENCY,
    displayPriceMonthly: 9,
    displayPriceAnnual: 8, // shown as per-month equivalent for the annual plan
    stripe: {
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_M,
      priceIdAnnual:  process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_Y,
    },
  },
  booster: {
    key: 'booster',
    title: 'Rocket',
    icon: 'fa-rocket',
    badge: 'MOST POPULAR',
    mostPopular: true,
    currency: CURRENCY,
    displayPriceMonthly: 19,
    displayPriceAnnual: 16,
    stripe: {
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BOOSTER_M,
      priceIdAnnual:  process.env.NEXT_PUBLIC_STRIPE_PRICE_BOOSTER_Y,
    },
  },
  master: {
    key: 'master',
    title: 'Owl',
    icon: 'fa-feather',
    currency: CURRENCY,
    displayPriceMonthly: 39,
    displayPriceAnnual: 35,
    stripe: {
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER_M,
      priceIdAnnual:  process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER_Y,
    },
  },
};

// Entitlements
export type Entitlements = {
  libraryFull: boolean;
  aiFeedback: 'none' | 'basic' | 'full';
  mockTestsPerMonth: number | 'unlimited';
  analytics: 'none' | 'basic' | 'advanced';
  proctoring: boolean;
  placement: boolean;
  prioritySupport: boolean;
};

export const PLAN_ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free:    { libraryFull: false, aiFeedback: 'basic', mockTestsPerMonth: 0,            analytics: 'basic',    proctoring: false, placement: false, prioritySupport: false },
  starter: { libraryFull: true,  aiFeedback: 'full',  mockTestsPerMonth: 2,            analytics: 'advanced', proctoring: false, placement: true,  prioritySupport: false },
  booster: { libraryFull: true,  aiFeedback: 'full',  mockTestsPerMonth: 4,            analytics: 'advanced', proctoring: false, placement: true,  prioritySupport: false },
  master:  { libraryFull: true,  aiFeedback: 'full',  mockTestsPerMonth: 'unlimited',  analytics: 'advanced', proctoring: true,  placement: true,  prioritySupport: true },
};

const PLAN_RANK: Record<PlanId, number> = { free: 0, starter: 1, booster: 2, master: 3 };
export const isAtLeast = (userPlan: PlanId, min: PlanId) => PLAN_RANK[userPlan] >= PLAN_RANK[min];

// Stripe priceId → plan
export function planFromPriceId(priceId?: string | null): PlanKey | null {
  if (!priceId) return null;
  const hit = Object.values(PLANS).find(p => p.stripe.priceIdMonthly === priceId || p.stripe.priceIdAnnual === priceId);
  return hit?.key ?? null;
}

// USD-first formatter (works for any currency via env)
export function formatMoney(amountMajorUnits: number, currency = CURRENCY, locale = CURRENCY_LOCALE) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 0, // keep clean whole numbers in UI
    }).format(amountMajorUnits);
  } catch {
    return `${currency} ${amountMajorUnits}`;
  }
}
