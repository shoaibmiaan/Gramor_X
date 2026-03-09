import { describe, expect, it } from 'vitest';

import { getPlanPricing } from '@/lib/subscription';
import { amountInCents } from '@/lib/payments/gateway';
import { priceCents } from '@/lib/billing/manual';

describe('subscription pricing consistency', () => {
  it('keeps monthly/annual major + cents coherent in service', () => {
    for (const plan of ['free', 'starter', 'booster', 'master'] as const) {
      const pricing = getPlanPricing(plan);
      expect(pricing.monthlyCents).toBe(Math.round(pricing.monthly * 100));
      expect(pricing.annualCents).toBe(Math.round(pricing.annual * 100));
      expect(pricing.monthlyDisplayFromAnnual).toBe(pricing.annual / 12);
    }
  });

  it('matches API/payment helper cents with service source', () => {
    for (const plan of ['starter', 'booster', 'master'] as const) {
      const pricing = getPlanPricing(plan);
      expect(amountInCents(plan, 'monthly')).toBe(pricing.monthlyCents);
      expect(amountInCents(plan, 'annual')).toBe(pricing.annualCents);
      expect(priceCents(plan, 'monthly')).toBe(pricing.monthlyCents);
      expect(priceCents(plan, 'annual')).toBe(pricing.annualCents);
    }
  });
});
