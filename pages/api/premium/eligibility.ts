// pages/api/premium/eligibility.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireActiveSubscription, InactiveSubscriptionError } from '@/lib/subscription';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Resp = { eligible: boolean; plan: string | null; reason?: string; upgrade?: Record<string, unknown> } | Record<string, unknown>;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ eligible: false, plan: null, reason: 'server_config_error' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(200).json({ eligible: false, plan: null, reason: 'unauthenticated' });
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(200).json({ eligible: false, plan: null, reason: 'unauthenticated' });
  }

  try {
    const active = await requireActiveSubscription(user.id);
    return res.status(200).json({ eligible: true, plan: active.plan });
  } catch (err) {
    if (err instanceof InactiveSubscriptionError) {
      return res.status(err.statusCode).json({ ...err.payload, eligible: false, plan: err.payload.currentPlan });
    }
    throw err;
  }
}
