// pages/api/payments/create-easypaisa-session.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { env } from '@/lib/env';

type PlanKey = 'starter' | 'booster' | 'master';
type Cycle = 'monthly' | 'annual';

type ReqBody = Readonly<{ plan: PlanKey; referralCode?: string; billingCycle?: Cycle }>;
type Success = Readonly<{ ok: true; url: string; sessionId: string }>;
type Failure = Readonly<{ ok: false; error: string }>;
type ResBody = Success | Failure;

const isPlan = (v: unknown): v is PlanKey =>
  typeof v === 'string' && ['starter', 'booster', 'master'].includes(v);
const isCycle = (v: unknown): v is Cycle =>
  typeof v === 'string' && ['monthly', 'annual'].includes(v);

const getOrigin = (req: NextApiRequest) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
};

const handler: NextApiHandler<ResBody> = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const body = req.body as Partial<ReqBody> | undefined;
  if (!body) return res.status(400).json({ ok: false, error: 'Missing body' });

  const plan = isPlan(body.plan) ? body.plan : 'booster';
  const billingCycle = isCycle(body.billingCycle) ? body.billingCycle : 'monthly';
  const referralCode = body.referralCode?.slice(0, 64);

  const supabase = createSupabaseServerClient({ req });
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id || 'anon';

  // Minimal dev-mode flow unless provider credentials are present
  const devMode = env.NEXT_PUBLIC_DEV_PAYMENTS === '1';

  // Create a pending payment record for tracking (optional table per Phase-2)
  try {
    await supabase.from('payment_events').insert([
      {
        provider: 'easypaisa',
        status: 'initiated',
        user_id: userId,
        metadata: { plan, billingCycle, referralCode },
      },
    ]);
  } catch {
    // non-fatal
  }

  const origin = getOrigin(req);

  // If real creds exist, you’d call Easypaisa order-create API here and return their redirect URL.
  // For now, support a safe dev path.
  if (devMode) {
    const sid = `ep_dev_${Date.now()}`;
    const url = `${origin}/checkout/success?session_id=${sid}&plan=${plan}`;
    return res.status(200).json({ ok: true, url, sessionId: sid });
  }

  return res
    .status(501)
    .json({ ok: false, error: 'Easypaisa not configured. Set NEXT_PUBLIC_DEV_PAYMENTS=1 for dev stub.' });
};

export default handler;
