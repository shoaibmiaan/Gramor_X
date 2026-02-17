// lib/plan/quotas.ts
// Shared quota helpers to reason about usage across plans.
// - Compatible with PLANS[plan].quota values: number | 'unlimited' | string(number)
// - Guards negative/NaN "used" values
// - Adds canConsume/applyConsumption + nicer labels for UI

import { PLAN_ORDER, PLANS, type PlanId } from '@/types/pricing';

export type QuotaKey = 'dailyMocks' | 'aiEvaluationsPerDay' | 'storageGB';

export type QuotaEvaluation = Readonly<{
  limit: number;       // Infinity when unlimited
  used: number;        // clamped to >= 0
  remaining: number;   // Infinity when unlimited
  exceeded: boolean;   // used >= limit (always false when unlimited)
  isUnlimited: boolean;
}>;

/** Coerce a PLANS.quota value to a numeric limit (Infinity for 'unlimited'). */
function coerceLimit(value: unknown): number {
  if (value === 'unlimited') return Infinity;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Get the numeric limit for a given plan/key (Infinity for 'unlimited'). */
function quotaLimit(plan: PlanId, key: QuotaKey): number {
  const planDef = PLANS[plan];
  if (!planDef || !planDef.quota) return 0;
  // tolerate missing key in a plan; treat as 0 rather than throwing
  const raw = (planDef.quota as Record<string, unknown>)[key];
  return coerceLimit(raw);
}

/** Core evaluator: produce a normalized snapshot for UI/logic. */
export function evaluateQuota(plan: PlanId, key: QuotaKey, usedRaw: number): QuotaEvaluation {
  const limit = quotaLimit(plan, key);
  const isUnlimited = limit === Infinity;

  // Defensive: clamp weird "used" values
  const used = Math.max(0, Number.isFinite(usedRaw) ? usedRaw : 0);

  if (isUnlimited) {
    return {
      limit: Infinity,
      used,
      remaining: Infinity,
      exceeded: false,
      isUnlimited: true,
    };
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

/** True iff at least `amount` units can be consumed under this plan/key. */
export function canConsume(plan: PlanId, key: QuotaKey, used: number, amount = 1): boolean {
  const { isUnlimited, remaining } = evaluateQuota(plan, key, used);
  return isUnlimited || remaining >= Math.max(1, amount);
}

/**
 * Returns the post-consumption evaluation if we *were* to consume `amount`.
 * Does not mutate anything — pure calculation for optimistic UI.
 */
export function applyConsumption(
  plan: PlanId,
  key: QuotaKey,
  used: number,
  amount = 1
): QuotaEvaluation {
  const amt = Math.max(1, amount);
  const snap = evaluateQuota(plan, key, used);
  if (snap.isUnlimited) return snap;
  return evaluateQuota(plan, key, used + amt);
}

/** Find the next plan (higher in PLAN_ORDER) that increases this quota key. */
export function nextPlanForQuota(plan: PlanId, key: QuotaKey): PlanId | null {
  const currentIdx = PLAN_ORDER.indexOf(plan);
  if (currentIdx < 0) return null;

  const currentLimit = quotaLimit(plan, key);

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i += 1) {
    const candidate = PLAN_ORDER[i]!;
    const candLimit = quotaLimit(candidate, key);

    // pick the first strictly better option, treating Infinity as the strongest
    if (candLimit === Infinity) return candidate;
    if (currentLimit === Infinity) continue; // nothing beats Infinity
    if (candLimit > currentLimit) return candidate;
  }
  return null;
}

/** Compare two plans for a quota key. Returns -1 (A worse), 0 (equal), 1 (A better). */
export function comparePlansForQuota(a: PlanId, b: PlanId, key: QuotaKey): -1 | 0 | 1 {
  const la = quotaLimit(a, key);
  const lb = quotaLimit(b, key);
  if (la === lb) return 0;
  if (la === Infinity) return 1;
  if (lb === Infinity) return -1;
  return la > lb ? 1 : -1;
}

/** Human-friendly label for the limit (e.g., "Unlimited", "50/day", "5 GB"). */
export function limitLabel(plan: PlanId, key: QuotaKey): string {
  const limit = quotaLimit(plan, key);
  if (limit === Infinity) return 'Unlimited';

  switch (key) {
    case 'dailyMocks':
      return `${limit}/day`;
    case 'aiEvaluationsPerDay':
      return `${limit}/day`;
    case 'storageGB':
      return `${limit} GB`;
    default:
      return String(limit);
  }
}

/** Short recommendation object for upgrade prompts/tooltips. */
export function upgradeAdvice(
  plan: PlanId,
  key: QuotaKey,
  used: number
): { nextPlan: PlanId | null; neededNow: boolean; message: string } {
  const evalSnap = evaluateQuota(plan, key, used);
  const nextPlan = nextPlanForQuota(plan, key);
  const neededNow = evalSnap.exceeded || evalSnap.remaining === 0;

  let message = '';
  if (evalSnap.isUnlimited) {
    message = 'Your plan already includes unlimited usage.';
  } else if (!nextPlan) {
    message = 'You are at the highest available limit for this quota.';
  } else {
    message = neededNow
      ? `You’ve hit your ${key} limit (${evalSnap.limit}). Upgrade to ${nextPlan} to continue.`
      : `Approaching your ${key} limit (${evalSnap.used}/${evalSnap.limit}). Consider upgrading to ${nextPlan}.`;
  }

  return { nextPlan, neededNow, message };
}

/** UTC day window helpers */
export function getUtcDayWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
