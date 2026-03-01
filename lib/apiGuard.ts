// lib/apiGuard.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { requireEntitlement } from '@/lib/entitlements/service';

type PlanId = 'free' | 'starter' | 'booster' | 'master';

type GuardOptions = {
  allowRoles?: Array<'admin' | 'teacher'>;
};

export function withPlan(required: PlanId, handler: NextApiHandler, options: GuardOptions = {}) {
  return async function wrapped(req: NextApiRequest, res: NextApiResponse) {
    if (required === 'free') {
      return handler(req, res);
    }

    const allowed = new Set<string>(options.allowRoles ?? []);
    if (required === 'master') {
      allowed.add('admin');
      allowed.add('teacher');
    }

    const entitlement = await requireEntitlement(req, res, required, { allowRoles: Array.from(allowed) });
    if (!entitlement.ok) return;

    return handler(req, res);
  };
}
