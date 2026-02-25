// pages/api/referrals/create-code.ts
import type { NextApiHandler } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';
import { trackor } from '@/lib/analytics/trackor.server';
import { generateReferralCode, REFERRAL_CODE_MIN_LENGTH, REFERRAL_CODE_MAX_LENGTH } from '@/lib/referrals/credit-rules';

const SUCCESS_STATUS = 200;

type Success = Readonly<{
  ok: true;
  code: string;
  balance: number;
  lifetimeEarned: number;
  totalReferrals: number;
}>;

type Failure = Readonly<{ ok: false; error: string }>;
type ResBody = Success | Failure;

async function ensureBalanceRow(userId: string) {
  const { data: existing } = await supabaseService
    .from('referral_credit_balances')
    .select('balance, lifetime_earned')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: inserted } = await supabaseService
    .from('referral_credit_balances')
    .insert({ user_id: userId })
    .select('balance, lifetime_earned')
    .single();
  return inserted ?? { balance: 0, lifetime_earned: 0 };
}

async function fetchReferralsCount(userId: string): Promise<number> {
  const { count } = await supabaseService
    .from('referral_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('status', 'completed');
  return count ?? 0;
}

const handler: NextApiHandler<ResBody> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { data: existing } = await supabaseService
    .from('referral_codes')
    .select('code, deactivated_at')
    .eq('user_id', userId)
    .is('deactivated_at', null)
    .maybeSingle();

  let code = existing?.code ?? null;

  if (!code) {
    const attempts = Math.max(5, REFERRAL_CODE_MAX_LENGTH - REFERRAL_CODE_MIN_LENGTH + 1);
    for (let i = 0; i < attempts; i += 1) {
      const length = REFERRAL_CODE_MIN_LENGTH + Math.floor(Math.random() * (REFERRAL_CODE_MAX_LENGTH - REFERRAL_CODE_MIN_LENGTH + 1));
      const candidate = generateReferralCode(length);
      const { data: dupe } = await supabaseService
        .from('referral_codes')
        .select('code')
        .eq('code', candidate)
        .maybeSingle();
      if (dupe?.code) continue;

      const { data: inserted, error: insertErr } = await supabaseService
        .from('referral_codes')
        .insert({ user_id: userId, code: candidate, metadata: { via: 'create-code' } })
        .select('code')
        .single();

      if (!insertErr && inserted?.code) {
        code = inserted.code;
        try {
          await trackor.log('referral.code.create', { userId, code });
        } catch {
          /* non-fatal */
        }
        break;
      }
    }
  }

  if (!code) {
    return res.status(500).json({ ok: false, error: 'Could not allocate referral code' });
  }

  const [{ balance = 0, lifetime_earned = 0 }, totalReferrals] = await Promise.all([
    ensureBalanceRow(userId),
    fetchReferralsCount(userId),
  ]);

  return res.status(SUCCESS_STATUS).json({
    ok: true,
    code,
    balance,
    lifetimeEarned: lifetime_earned,
    totalReferrals,
  });
};

export default handler;
