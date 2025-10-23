// lib/flags/index.ts
// Unified feature flag registry backed by env defaults + Supabase table overrides.
// - Server: fetches flag rows with light caching, supports audience targeting.
// - Client: hydrated via /api/debug/feature-flags snapshot and works offline.

import { bool, env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PlanId } from '@/types/pricing';

export type FeatureFlagKey =
  | 'trial'
  | 'paywall'
  | 'referral'
  | 'partner'
  | 'predictor'
  | 'challenge'
  | 'coach'
  | 'notifications'
  | 'quickTen'
  | 'aiAssist'
  | 'writingExports'
  | 'writingCertificates'
  | 'killSwitchWriting'
  | 'killSwitchAiCoach'
  | 'killSwitchAuth'
  | 'adminConsole'
  | 'perfBudgets';

export type FlagAudience = {
  plan?: PlanId | null;
  role?: string | null;
  userId?: string | null;
};

export type FlagTargeting = {
  plans?: PlanId[] | null;
  roles?: string[] | null;
  percentage?: number | null;
};

export type FlagRow = {
  key: string;
  enabled: boolean;
  audience: FlagTargeting | null;
  updated_at?: string | null;
};

const STATIC_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  trial: bool(env.NEXT_PUBLIC_FEATURE_TRIAL, true),
  paywall: bool(env.NEXT_PUBLIC_FEATURE_PAYWALL, true),
  referral: bool(env.NEXT_PUBLIC_FEATURE_REFERRAL, false),
  partner: bool(env.NEXT_PUBLIC_FEATURE_PARTNER, false),
  predictor: bool(env.NEXT_PUBLIC_FEATURE_PREDICTOR, true),
  challenge: bool(env.NEXT_PUBLIC_FEATURE_CHALLENGE, false),
  coach: bool(env.NEXT_PUBLIC_FEATURE_COACH, false),
  notifications: bool(env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS, false),
  quickTen: bool(env.NEXT_PUBLIC_FEATURE_QUICK_TEN, false),
  aiAssist: bool(env.NEXT_PUBLIC_FEATURE_AI_ASSIST, false),
  writingExports: false,
  writingCertificates: false,
  killSwitchWriting: false,
  killSwitchAiCoach: false,
  killSwitchAuth: false,
  adminConsole: false,
  perfBudgets: false,
};

type DynamicMap = Map<string, FlagRow>;

let dynamicFlags: DynamicMap = new Map();
let lastRefresh = 0;
const REFRESH_MS = 60_000;
let inFlight: Promise<void> | null = null;

let clientSnapshot: Record<string, boolean> = { ...STATIC_DEFAULTS };

const inBrowser = () => typeof window !== 'undefined';

const normalisePercentage = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return Math.round(value);
};

const hashPercent = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
};

function matchesAudience(flag: FlagRow, audience?: FlagAudience | null): boolean {
  if (!flag.audience) return true;
  const targeting = flag.audience;
  if (!audience) {
    // Without audience context we cannot safely evaluate targeted flags → default deny.
    return false;
  }

  if (Array.isArray(targeting.plans) && targeting.plans.length > 0) {
    if (!audience.plan || !targeting.plans.includes(audience.plan)) {
      return false;
    }
  }

  if (Array.isArray(targeting.roles) && targeting.roles.length > 0) {
    const role = (audience.role ?? '').toLowerCase();
    if (!role || !targeting.roles.map((r) => r.toLowerCase()).includes(role)) {
      return false;
    }
  }

  const pct = normalisePercentage(targeting.percentage ?? null);
  if (pct != null) {
    const basis = audience.userId ?? `${audience.plan ?? ''}:${audience.role ?? ''}`;
    if (!basis) return false;
    const bucket = hashPercent(basis);
    return bucket < pct;
  }

  return true;
}

async function ensureDynamicFlags(force = false): Promise<void> {
  if (inBrowser()) return;
  if (!supabaseAdmin) return;
  const now = Date.now();
  if (!force && now - lastRefresh < REFRESH_MS) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .select('key, enabled, audience, updated_at');
    if (error) {
      console.error('[flags] failed to load feature_flags table', error.message);
      inFlight = null;
      return;
    }
    dynamicFlags = new Map(
      (data ?? []).map((row) => [row.key, {
        key: row.key,
        enabled: Boolean(row.enabled),
        audience: row.audience as FlagTargeting | null,
        updated_at: row.updated_at ?? null,
      }]),
    );
    lastRefresh = Date.now();
    inFlight = null;
  })();

  await inFlight;
}

function resolveFlagValue(key: string, audience?: FlagAudience | null): boolean {
  const staticDefault = STATIC_DEFAULTS[key as FeatureFlagKey] ?? false;
  const record = dynamicFlags.get(key);
  if (!record) return staticDefault;
  if (!record.enabled) return false;
  return matchesAudience(record, audience);
}

export type FlagSnapshot = Record<string, boolean>;

export async function resolveFlags(audience?: FlagAudience | null): Promise<FlagSnapshot> {
  if (inBrowser()) return { ...clientSnapshot };
  await ensureDynamicFlags(false);
  const entries = new Set<string>([
    ...Object.keys(STATIC_DEFAULTS),
    ...Array.from(dynamicFlags.keys()),
  ]);
  const snapshot: FlagSnapshot = {};
  entries.forEach((key) => {
    snapshot[key] = resolveFlagValue(key, audience);
  });
  return snapshot;
}

export async function serverEnabled(
  key: FeatureFlagKey,
  audience?: FlagAudience | null,
): Promise<boolean> {
  await ensureDynamicFlags(false);
  return resolveFlagValue(key, audience);
}

export function primeClientSnapshot(snapshot: FlagSnapshot) {
  clientSnapshot = { ...STATIC_DEFAULTS, ...snapshot };
}

export function invalidateFlagCache() {
  lastRefresh = 0;
}

export const flags = {
  enabled(key: FeatureFlagKey, audience?: FlagAudience | null) {
    if (inBrowser()) {
      return Boolean(clientSnapshot[key] ?? STATIC_DEFAULTS[key]);
    }
    return resolveFlagValue(key, audience);
  },
  snapshot() {
    if (inBrowser()) {
      return { ...clientSnapshot };
    }
    const entries = new Set<string>([
      ...Object.keys(STATIC_DEFAULTS),
      ...Array.from(dynamicFlags.keys()),
    ]);
    const snap: FlagSnapshot = {};
    entries.forEach((key) => {
      snap[key] = resolveFlagValue(key);
    });
    return snap;
  },
};

