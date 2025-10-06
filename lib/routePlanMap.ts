// lib/routePlanMap.ts
import type { PlanId } from '@/types/pricing';

export type RouteGate = { pattern: RegExp; min: PlanId };

// Map routes → minimum plan (edit here, not in pages)
export const ROUTE_GATES: RouteGate[] = [
  { pattern: /^\/ai\/(speaking|writing|reading)/, min: 'starter' },
  { pattern: /^\/marketplace\/apply$/,           min: 'starter' },

  { pattern: /^\/content\/upload/,               min: 'booster' },

  { pattern: /^\/admin\/teachers(\/|$)/,         min: 'master' },
  { pattern: /^\/classes(\/|$)/,                 min: 'master' },
  { pattern: /^\/institutions(\/|$)/,            min: 'master' },
  { pattern: /^\/content\/publish(\/|$)/,        min: 'master' },
];
