// pages/api/admin/premium/promo-usage.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { normalizePromoCode } from '@/lib/promotions/codes';
import { requireRole } from '@/lib/requireRole';
import { supabaseService } from '@/lib/supabaseService';
import type { Cycle, PlanKey } from '@/types/payments';
import type { PaymentProvider } from '@/lib/payments/gateway';

type PromoUsageRow = Readonly<{
  intentId: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  promoCode: string;
  referralCode: string | null;
  plan: PlanKey;
  cycle: Cycle;
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  manual: boolean;
}>;

type ListResponse = { ok: true; data: PromoUsageRow[] } | { ok: false; error: string };

type PaymentIntentRow = Readonly<{
  id: string;
  user_id: string | null;
  plan_id: PlanKey;
  cycle: Cycle;
  provider: PaymentProvider;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  confirmed_at: string | null;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    await requireRole(req, ['admin']);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unauthorized';
    const status = message === 'unauthorized' ? 401 : 403;
    return res.status(status).json({ ok: false, error: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' });
  }

  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = Number.isInteger(Number(limitParam)) ? Math.min(Math.max(Number(limitParam), 1), 500) : 200;

  const { data, error } = await supabaseService
    .from('payment_intents')
    .select(
      'id, user_id, plan_id, cycle, provider, amount_cents, currency, status, metadata, created_at, confirmed_at',
    )
    .in('status', ['succeeded', 'manual'])
    .not('metadata->>promoCode', 'is', null)
    .neq('metadata->>promoCode', '')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return res.status(500).json({ ok: false, error: error?.message ?? 'SERVER_ERROR' });
  }

  const rows = data as PaymentIntentRow[];
  const usage: PromoUsageRow[] = [];
  const userIds = new Set<string>();

  for (const row of rows) {
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const rawPromo = typeof metadata.promoCode === 'string' ? metadata.promoCode : null;
    const normalized = rawPromo ? normalizePromoCode(rawPromo) : null;
    if (!normalized) continue;

    const referral = typeof metadata.referralCode === 'string' ? metadata.referralCode.trim() : '';
    const manual = typeof metadata.manual === 'boolean' ? metadata.manual : Boolean(metadata.manual);
    const userId = row.user_id;
    if (userId) {
      userIds.add(userId);
    }

    usage.push({
      intentId: row.id,
      userId,
      userEmail: null,
      userName: null,
      promoCode: normalized,
      referralCode: referral.length > 0 ? referral : null,
      plan: row.plan_id,
      cycle: row.cycle,
      provider: row.provider,
      amountCents: row.amount_cents ?? 0,
      currency: row.currency ?? 'USD',
      status: row.status,
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
      manual,
    });
  }

  if (usage.length === 0) {
    return res.status(200).json({ ok: true, data: usage });
  }

  if (userIds.size > 0) {
    const { data: profiles, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, email, full_name')
      .in('id', Array.from(userIds));

    if (!profileError && profiles) {
      const map = new Map<string, { email: string | null; full_name: string | null }>();
      for (const profile of profiles as Array<{ id: string; email: string | null; full_name: string | null }>) {
        map.set(profile.id, { email: profile.email, full_name: profile.full_name });
      }

      for (const row of usage) {
        if (!row.userId) continue;
        const profile = map.get(row.userId);
        if (profile) {
          (row as { userEmail: string | null }).userEmail = profile.email ?? null;
          (row as { userName: string | null }).userName = profile.full_name ?? null;
        }
      }
    }
  }

  return res.status(200).json({ ok: true, data: usage });
}
