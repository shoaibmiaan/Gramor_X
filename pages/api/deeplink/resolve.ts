import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';

import { DEEPLINK_LOOKUP, type DeeplinkDefinition } from '@/data/mobile/deeplinks';
import { hasPlan } from '@/lib/planAccess';
import type { AppRole } from '@/lib/roles';
import { supabaseServer } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';

type ProfileRow = { plan?: string | null; plan_id?: string | null; role?: string | null } | null;

type ResolveSuccess = {
  ok: true;
  slug: string;
  href: string;
  minPlan: PlanId;
  requiresAuth: boolean;
  restrictedTo: AppRole[] | null;
  allowRoles: AppRole[];
  currentPlan: PlanId;
  role: AppRole | null;
};

type ResolveError =
  | { ok: false; error: 'method_not_allowed'; allow: string[] }
  | { ok: false; error: 'missing_slug' | 'invalid_slug'; message: string }
  | { ok: false; error: 'unauthorized'; message: string }
  | { ok: false; error: 'upgrade_required'; message: string; requiredPlan: PlanId; currentPlan: PlanId }
  | { ok: false; error: 'forbidden'; message: string; restrictedTo: AppRole[] }
  | { ok: false; error: 'server_error'; message: string };

type ApiResponse = ResolveSuccess | ResolveError;

type Dependencies = {
  getClient: typeof supabaseServer;
};

const dependencies: Dependencies = {
  getClient: supabaseServer,
};

export function __setDeeplinkResolveTestOverrides(overrides: Partial<Dependencies>) {
  if (process.env.NODE_ENV !== 'test') return;
  if (overrides.getClient) dependencies.getClient = overrides.getClient;
}

export function __resetDeeplinkResolveTestOverrides() {
  dependencies.getClient = supabaseServer;
}

function normalizePlan(raw: string | null | undefined): PlanId {
  const value = raw?.toLowerCase() ?? 'free';
  if (value === 'starter' || value === 'booster' || value === 'master') return value;
  return 'free';
}

function normalizeRole(raw: string | null | undefined): AppRole | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value === 'admin' || value === 'teacher' || value === 'student') return value;
  return null;
}

function requiresAuth(def: DeeplinkDefinition): boolean {
  if (typeof def.requiresAuth === 'boolean') return def.requiresAuth;
  return def.minPlan !== 'free';
}

function deriveRole(profileRole: string | null | undefined, user: User | null): AppRole | null {
  const fromProfile = normalizeRole(profileRole);
  if (fromProfile) return fromProfile;
  const metaRole =
    normalizeRole((user?.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined) ??
    normalizeRole((user?.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined);
  return metaRole;
}

async function loadAuthContext(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  def: DeeplinkDefinition,
): Promise<{ user: User | null; plan: PlanId; role: AppRole | null } | ApiResponse> {
  const client = dependencies.getClient(req, res);

  const { data, error: authError } = await client.auth.getUser();
  if (authError) {
    return { ok: false, error: 'server_error', message: 'Authentication lookup failed' };
  }

  const user = data?.user ?? null;
  const mustAuth = requiresAuth(def) || def.minPlan !== 'free' || !!def.restrictedTo;

  if (mustAuth && !user) {
    return { ok: false, error: 'unauthorized', message: 'Sign-in required for this deeplink' };
  }

  if (!user) {
    return { user: null, plan: 'free', role: null };
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('plan, plan_id, role')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return { ok: false, error: 'server_error', message: 'Profile lookup failed' };
  }

  const planValue = normalizePlan(profile?.plan ?? profile?.plan_id ?? null);
  const role = deriveRole(profile?.role ?? null, user);

  return { user, plan: planValue, role };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'method_not_allowed', allow: ['GET'] });
    return;
  }

  const slugRaw = req.query.slug;
  if (typeof slugRaw === 'undefined') {
    res.status(400).json({ ok: false, error: 'missing_slug', message: 'Provide a deeplink slug' });
    return;
  }

  if (Array.isArray(slugRaw)) {
    res.status(400).json({ ok: false, error: 'invalid_slug', message: 'Multiple slug values are not allowed' });
    return;
  }

  const slug = slugRaw.trim().toLowerCase();
  const definition = DEEPLINK_LOOKUP[slug];

  if (!definition) {
    res.status(404).json({ ok: false, error: 'invalid_slug', message: `No deeplink registered for "${slug}"` });
    return;
  }

  const auth = await loadAuthContext(req, res, definition);
  if ('ok' in auth && auth.ok === false) {
    const status = auth.error === 'unauthorized' ? 401 : auth.error === 'server_error' ? 500 : 400;
    res.status(status).json(auth);
    return;
  }

  const { user, plan, role } = auth;

  const restricted = definition.restrictedTo ? new Set<AppRole>(definition.restrictedTo) : null;
  if (restricted) {
    if (!role) {
      res.status(403).json({
        ok: false,
        error: 'forbidden',
        message: 'This deeplink is limited to specific roles',
        restrictedTo: [...restricted],
      });
      return;
    }
    if (!restricted.has(role)) {
      res.status(403).json({
        ok: false,
        error: 'forbidden',
        message: 'This deeplink is limited to specific roles',
        restrictedTo: [...restricted],
      });
      return;
    }
  }

  const bypassRoles = new Set<AppRole>(['admin', ...(definition.allowRoles ?? [])]);

  const shouldCheckPlan = definition.minPlan !== 'free';
  if (shouldCheckPlan) {
    if (!user) {
      res.status(401).json({ ok: false, error: 'unauthorized', message: 'Sign-in required for this deeplink' });
      return;
    }
    if (!role || !bypassRoles.has(role)) {
      if (!hasPlan(plan, definition.minPlan)) {
        res.status(402).json({
          ok: false,
          error: 'upgrade_required',
          message: 'Upgrade required for this deeplink',
          requiredPlan: definition.minPlan,
          currentPlan: plan,
        });
        return;
      }
    }
  }

  res.status(200).json({
    ok: true,
    slug: definition.slug,
    href: definition.href,
    minPlan: definition.minPlan,
    requiresAuth: requiresAuth(definition),
    restrictedTo: definition.restrictedTo ? [...definition.restrictedTo] : null,
    allowRoles: definition.allowRoles ? [...definition.allowRoles] : [],
    currentPlan: plan,
    role: role ?? null,
  });
}

