// types/pricing.ts
// -----------------------------------------------------------------------------
// Unified, type-safe plan registry with ranks, aliases, and helpers
// - Keeps your lowercase IDs and richer fields (monthly & annual, quotas, features)
// - Adds PLAN_ORDER/PLAN_RANK and meets()/comparePlans() for clean gating
// - Adds alias mapping so "seedling/rocket/owl" map to "starter/booster/master"
// -----------------------------------------------------------------------------

import { USD_PLAN_PRICES } from '@/lib/pricing';

export type PlanId = 'free' | 'starter' | 'booster' | 'master';

export interface Plan {
  id: PlanId;
  /** Human-readable name used in UI (keep your labels). */
  name: string; // e.g., "Explorer (Free)", "Starter (Seedling)"
  /** Optional short label for chips/badges if needed. */
  shortName?: string; // e.g., "Free", "Starter", "Booster", "Master"
  /** Optional tagline showing under the plan name. */
  tagline?: string;
  /** UI emphasis (e.g., Booster as featured). */
  highlight?: boolean;
  /** Monthly price in USD (0 for free). */
  monthlyUSD: number;
  /** Annual price in USD (0 for free). */
  annualUSD: number;
  /** Plan quotas your app already uses. */
  quota: {
    dailyMocks: number;
    aiEvaluationsPerDay: number;
    storageGB: number;
  };
  /** Marketing/UX feature bullets. */
  features: string[];
  /** Acceptable synonyms/aliases that should map to this plan id. */
  aliases?: string[]; // e.g., ['seedling'] → 'starter', ['rocket'] → 'booster', ['owl'] → 'master'
}

/** Canonical registry (your labels kept, plus shortName + aliases). */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Explorer (Free)',
    shortName: 'Free',
    tagline: 'Start your IELTS journey',
    monthlyUSD: 0,
    annualUSD: 0,
    quota: { dailyMocks: 1, aiEvaluationsPerDay: 2, storageGB: 1 },
    features: [
      'Listening/Reading/Writing/Speaking basic practice',
      'Basic AI feedback (light)',
      'Daily vocab quiz',
      'Community access (read)',
    ],
    aliases: ['explorer'],
  },
  starter: {
    id: 'starter',
    name: 'Starter (Seedling)',
    shortName: 'Starter',
    tagline: 'Build consistent habits',
    monthlyUSD: USD_PLAN_PRICES.starter.monthly,
    annualUSD: USD_PLAN_PRICES.starter.annual,
    quota: { dailyMocks: 2, aiEvaluationsPerDay: 10, storageGB: 5 },
    features: [
      'All Free features',
      'Unlock more mock tests',
      'AI writing/speaking eval – standard',
      'Study plan with reminders',
    ],
    aliases: ['seedling'],
  },
  booster: {
    id: 'booster',
    name: 'Booster (Rocket)',
    shortName: 'Booster',
    tagline: 'Serious prep, fast',
    highlight: true,
    monthlyUSD: USD_PLAN_PRICES.booster.monthly,
    annualUSD: USD_PLAN_PRICES.booster.annual,
    quota: { dailyMocks: 5, aiEvaluationsPerDay: 40, storageGB: 15 },
    features: [
      'All Starter features',
      'Advanced analytics & band predictor',
      'Mistake patterns + targeted drills',
    ],
    aliases: ['rocket'],
  },
  master: {
    id: 'master',
    name: 'Master (Owl)',
    shortName: 'Master',
    tagline: 'Max score, full control',
    monthlyUSD: USD_PLAN_PRICES.master.monthly,
    annualUSD: USD_PLAN_PRICES.master.annual,
    quota: { dailyMocks: 10, aiEvaluationsPerDay: 120, storageGB: 50 },
    features: [
      'All Booster features',
      'Coach feedback slots (when available)',
      'Speaking room & pro prompts',
      'Exportable reports & certificates',
    ],
    aliases: ['owl'],
  },
} as const;

/** Stable plan order (low → high). */
export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'booster', 'master'] as const;

/** Numeric rank for quick comparisons. */
export const PLAN_RANK: Record<PlanId, number> = PLAN_ORDER
  .reduce((acc, id, idx) => { acc[id] = idx; return acc; }, {} as Record<PlanId, number>);

/** Array of all known aliases → canonical id map (case-insensitive). */
const PLAN_ALIAS_ENTRIES: Array<[string, PlanId]> = Object.values(PLANS).flatMap(p => {
  const aliases = (p.aliases ?? []).concat(p.id, p.shortName ?? [], p.name);
  return aliases.map(a => [a.toLowerCase(), p.id] as [string, PlanId]);
});

/** Alias lookup map, built once. */
export const PLAN_ALIAS_MAP: Record<string, PlanId> = Object.fromEntries(PLAN_ALIAS_ENTRIES);

/** Get the canonical plan definition. */
export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

/** Whether plan is not free. */
export function isPaidPlan(id: PlanId): boolean {
  return id !== 'free';
}

/** Compare two plans by rank. Returns -1, 0, 1 like `Array.sort`. */
export function comparePlans(a: PlanId, b: PlanId): -1 | 0 | 1 {
  const da = PLAN_RANK[a], db = PLAN_RANK[b];
  return da < db ? -1 : da > db ? 1 : 0;
}

/** True if `current` meets or exceeds `min`. */
export function meets(min: PlanId, current: PlanId): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[min];
}

/** Normalize arbitrary input (id/name/alias) to a safe PlanId, defaults to 'free'. */
export function coercePlanId(input?: string | null): PlanId {
  if (!input) return 'free';
  const key = input.trim().toLowerCase();
  return PLAN_ALIAS_MAP[key] ?? 'free';
}

/** Handy constant for rendering pricing tables. */
export const PLAN_IDS = PLAN_ORDER.slice() as PlanId[];
/** Handy constant for feature lists / name lookups. */
export const PLAN_LIST: Plan[] = PLAN_IDS.map(id => PLANS[id]);
/** Re-export for convenience in other modules. */
export type PlanQuota = Plan['quota'];
