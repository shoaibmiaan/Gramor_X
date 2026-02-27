// lib/planAccess.ts
import type { PlanId } from '@/types/pricing';

export const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  starter: 1,   // Seedling
  booster: 2,   // Rocket
  master: 3,    // Owl
};

export function hasPlan(userPlan: PlanId, min: PlanId) {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[min];
}
