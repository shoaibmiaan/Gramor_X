import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createPendingPayment } from '@/lib/billing/manual';
import { type PlanKey, type Cycle, PLANS } from '@/lib/pricing';

type Resp =
  | { ok: true; message: string }
  | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => req.cookies[n] } }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { planKey, cycle, name, phone } = req.body as {
    planKey?: string; cycle?: string; name?: string; phone?: string;
  };

  if (!planKey || !cycle) return res.status(400).json({ ok: false, error: 'missing_fields' });
  if (!['starter','booster','master'].includes(planKey)) return res.status(400).json({ ok: false, error: 'invalid_plan' });
  if (!['monthly','annual'].includes(cycle)) return res.status(400).json({ ok: false, error: 'invalid_cycle' });

  try {
    // Basic authenticity checks (expand as needed)
    if (name && name.length > 100) return res.status(400).json({ ok: false, error: 'name_too_long' });
    if (phone && phone.length > 40) return res.status(400).json({ ok: false, error: 'phone_too_long' });

    await createPendingPayment({
      userId: user.id,
      email: user.email,
      plan: planKey as PlanKey,
      cycle: cycle as Cycle,
      name, phone,
      note: 'Manual checkout (payment gateway unavailable)',
    });

    return res.status(200).json({
      ok: true,
      message: 'Your subscription is activated. Your card was NOT charged; amount is marked as due. We will notify you before retrying payment.',
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'internal_error' });
  }
}
