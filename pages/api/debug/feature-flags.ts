// pages/api/debug/feature-flags.ts
// Returns feature flag snapshot for the current session. Used for hydration.

import type { NextApiRequest, NextApiResponse } from 'next';

import { resolveFlags, type FlagAudience } from '@/lib/flags';
import { getServerClient } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';

const normalisePlan = (raw?: string | null): PlanId => {
  if (!raw) return 'free';
  const lower = raw.toLowerCase();
  if (lower === 'starter' || lower === 'booster' || lower === 'master') return lower;
  return 'free';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let audience: FlagAudience | undefined;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('plan, role')
      .eq('id', user.id)
      .maybeSingle();

    const plan = normalisePlan((data as { plan?: string | null } | null)?.plan ?? null);
    const role = ((data as { role?: string | null } | null)?.role ?? null) as string | null;
    audience = { plan, role, userId: user.id };
  }

  const snapshot = await resolveFlags(audience);
  res.status(200).json({ ok: true, flags: snapshot, audience: audience ?? null });
}

