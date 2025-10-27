// pages/api/referrals/stats.ts
import type { NextApiHandler } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';
import type { ReferralSummary } from '@/types/referrals';

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const [{ data: codeRow }, { data: balanceRow }, { data: redemptions }] = await Promise.all([
    supabaseService
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .is('deactivated_at', null)
      .maybeSingle(),
    supabaseService
      .from('referral_credit_balances')
      .select('balance, lifetime_earned')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseService
      .from('referral_redemptions')
      .select('status, referrer_credit, referred_credit, created_at')
      .eq('referrer_id', userId),
  ]);

  const summary: ReferralSummary = {
    code: codeRow?.code ?? null,
    balance: balanceRow?.balance ?? 0,
    lifetimeEarned: balanceRow?.lifetime_earned ?? 0,
    totalReferrals: redemptions?.length ?? 0,
    approvedReferrals: 0,
    pendingReferrals: 0,
  };

  for (const redemption of redemptions ?? []) {
    if (redemption.status === 'completed' || redemption.status === 'approved') {
      summary.approvedReferrals += 1;
    } else if (redemption.status === 'pending') {
      summary.pendingReferrals += 1;
    }
  }

  return res.status(200).json({ ok: true, stats: summary });
};

export default handler;
