// pages/api/referrals/redeem.ts
import { createHash } from 'node:crypto';
import type { NextApiHandler, NextApiRequest } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';
import { trackor } from '@/lib/analytics/trackor.server';
import { creditsForContext, normalizeCode, MAX_DEVICE_REDEMPTIONS } from '@/lib/referrals/credit-rules';

type RedeemBody = Readonly<{ code: string; context?: 'signup' | 'checkout' | 'account'; deviceFingerprint?: string | null }>;

type Success = Readonly<{ ok: true; awarded: number; referrerAwarded: number; balance: number }>;
type Failure = Readonly<{ ok: false; error: string }>;
type ResBody = Success | Failure;

function fingerprint(req: NextApiRequest, hint?: string | null): string | null {
  const manual = typeof hint === 'string' ? hint.trim() : '';
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? '';
  const ip = rawIp.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  const agent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
  const seed = manual || `${ip}::${agent}`;
  if (!seed) return null;
  return createHash('sha256').update(seed).digest('hex');
}

const handler: NextApiHandler<ResBody> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const body: Partial<RedeemBody> = req.body ?? {};
  const normalized = normalizeCode(String(body.code ?? ''));
  const context = (body.context as RedeemBody['context']) ?? 'checkout';
  if (!normalized || normalized.length < 6) {
    return res.status(400).json({ ok: false, error: 'Invalid code' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const deviceHash = fingerprint(req, body.deviceFingerprint);

  const { data: codeRow } = await supabaseService
    .from('referral_codes')
    .select('code, user_id, deactivated_at')
    .eq('code', normalized)
    .maybeSingle();

  if (!codeRow || codeRow.deactivated_at) {
    return res.status(404).json({ ok: false, error: 'Referral code not found' });
  }

  if (codeRow.user_id === userId) {
    return res.status(400).json({ ok: false, error: 'You cannot redeem your own code' });
  }

  const { data: existing } = await supabaseService
    .from('referral_redemptions')
    .select('id')
    .eq('referred_id', userId)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ ok: false, error: 'A referral has already been applied to your account' });
  }

  if (deviceHash) {
    const { count: deviceCount } = await supabaseService
      .from('referral_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('device_hash', deviceHash);

    if ((deviceCount ?? 0) >= MAX_DEVICE_REDEMPTIONS) {
      return res.status(400).json({
        ok: false,
        error: MAX_DEVICE_REDEMPTIONS === 1
          ? 'This device has already redeemed a referral'
          : 'This device has reached the referral redemption limit',
      });
    }
  }

  const { count: completedCount } = await supabaseService
    .from('referral_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', codeRow.user_id)
    .eq('status', 'completed');

  const reward = creditsForContext({ completedReferrals: completedCount ?? 0 });

  const nowIso = new Date().toISOString();

  const { data: redemption, error: insertErr } = await supabaseService
    .from('referral_redemptions')
    .insert({
      code: normalized,
      referrer_id: codeRow.user_id,
      referred_id: userId,
      device_hash: deviceHash,
      status: 'completed',
      context,
      referrer_credit: reward.referrer,
      referred_credit: reward.referred,
      metadata: {
        userAgent: req.headers['user-agent'] ?? null,
      },
      confirmed_at: nowIso,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.message?.includes('duplicate key value')) {
      return res.status(400).json({ ok: false, error: 'Referral already redeemed' });
    }
    return res.status(500).json({ ok: false, error: 'Could not record redemption' });
  }

  const { data: balanceRows } = await supabaseService
    .from('referral_credit_balances')
    .select('user_id, balance, lifetime_earned')
    .in('user_id', [codeRow.user_id, userId]);

  const balances = new Map(balanceRows?.map((row) => [row.user_id, row] as const));

  const referrerPrev = balances.get(codeRow.user_id) ?? { balance: 0, lifetime_earned: 0 };
  const referredPrev = balances.get(userId) ?? { balance: 0, lifetime_earned: 0 };

  const referrerNext = {
    user_id: codeRow.user_id,
    balance: referrerPrev.balance + reward.referrer,
    lifetime_earned: referrerPrev.lifetime_earned + reward.referrer,
    updated_at: nowIso,
  };

  const referredNext = {
    user_id: userId,
    balance: referredPrev.balance + reward.referred,
    lifetime_earned: referredPrev.lifetime_earned + reward.referred,
    updated_at: nowIso,
  };

  await supabaseService
    .from('referral_credit_balances')
    .upsert([referrerNext, referredNext]);

  await supabaseService.from('referral_credit_events').insert([
    {
      user_id: codeRow.user_id,
      delta: reward.referrer,
      balance_after: referrerNext.balance,
      reason: 'referral_referrer_bonus',
      metadata: { code: normalized, redemption_id: redemption?.id ?? null },
    },
    {
      user_id: userId,
      delta: reward.referred,
      balance_after: referredNext.balance,
      reason: 'referral_redeem_bonus',
      metadata: { code: normalized, redemption_id: redemption?.id ?? null },
    },
  ]);

  try {
    await trackor.log('referral.code.redeem', {
      code: normalized,
      userId,
      referrerId: codeRow.user_id,
      context,
      deviceFingerprint: deviceHash ?? undefined,
    });
  } catch {
    /* ignore */
  }

  return res.status(200).json({
    ok: true,
    awarded: reward.referred,
    referrerAwarded: reward.referrer,
    balance: referredNext.balance,
  });
};

export default handler;
