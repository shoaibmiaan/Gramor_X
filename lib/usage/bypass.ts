// lib/usage/bypass.ts
import type { PlanId } from '@/types/pricing';

/**
 * Quota bypass rules:
 * - Admin: ALWAYS bypass (no quota).
 * - Everyone else: no bypass (plans/quotas apply).
 */
export function isQuotaBypassed(params: { role?: string | null; plan?: PlanId | null }) {
  const role = (params.role || '').toLowerCase();
  if (role === 'admin') return true;
  return false;
}

export default isQuotaBypassed;
