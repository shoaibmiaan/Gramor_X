// lib/plan/quotas.ts
// Shared quota helpers to reason about usage across plans.

import { PLAN_ORDER, PLANS, type PlanId } from '@/types/pricing';

export type QuotaKey = 'dailyMocks' | 'aiEvaluationsPerDay' | 'storageGB';

export type QuotaEvaluation = Readonly<{
  limit: number;
  used: number;
  remaining: number;
  exceeded: boolean;
  isUnlimited: boolean;
}>;

function quotaLimit(plan: PlanId, key: QuotaKey): number {
  const planDef = PLANS[plan];
  if (!planDef) return 0;
  const value = planDef.quota[key];
  if (typeof value === 'number') return value;
  if (value === 'unlimited') return Infinity;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function evaluateQuota(plan: PlanId, key: QuotaKey, used: number): QuotaEvaluation {
  const limit = quotaLimit(plan, key);
  const isUnlimited = limit === Infinity;
  if (isUnlimited) {
    return { limit: Infinity, used, remaining: Infinity, exceeded: false, isUnlimited: true };
  }
  const remaining = Math.max(0, limit - used);
  return {
    limit,
    used,
    remaining,
    exceeded: used >= limit,
    isUnlimited: false,
  };
}

export function nextPlanForQuota(plan: PlanId, key: QuotaKey): PlanId | null {
  const currentIdx = PLAN_ORDER.indexOf(plan);
  if (currentIdx < 0) return null;
  const currentLimit = quotaLimit(plan, key);
  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i += 1) {
    const candidate = PLAN_ORDER[i];
    const limit = quotaLimit(candidate, key);
    const isUnlimited = limit === Infinity;
    if (isUnlimited || limit > currentLimit) return candidate;
  }
  return null;
}
