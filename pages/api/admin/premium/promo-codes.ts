// pages/api/admin/premium/promo-codes.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { normalizePromoCode, type PromoCodeRule } from '@/lib/promotions/codes';
import { mapRowToPromoRule } from '@/lib/promotions/dynamic';
import { requireRole } from '@/lib/requireRole';
import { supabaseService } from '@/lib/supabaseService';
import type { Cycle, PlanKey, PaymentMethod } from '@/types/payments';

type ListResponse = { ok: true; data: PromoCodeRule[] } | { ok: false; error: string };
type CreateResponse =
  | { ok: true; data: PromoCodeRule }
  | { ok: false; error: 'BAD_INPUT' | 'DUPLICATE' | 'SERVER_ERROR' };

type PromoPayload = Readonly<{
  code: string;
  label: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  appliesTo?: Readonly<{
    plans?: PlanKey[];
    cycles?: Cycle[];
    methods?: PaymentMethod[];
  }>;
  stackableWithReferral?: boolean;
  notes?: string;
  isActive?: boolean;
}>;

const isPlanKey = (value: unknown): value is PlanKey =>
  value === 'starter' || value === 'booster' || value === 'master';

const isCycle = (value: unknown): value is Cycle => value === 'monthly' || value === 'annual';

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  value === 'stripe' || value === 'easypaisa' || value === 'jazzcash' || value === 'safepay' || value === 'crypto';

function validatePayload(body: unknown): PromoPayload | null {
  if (!body || typeof body !== 'object') return null;
  const payload = body as Partial<PromoPayload>;
  if (!payload.code || typeof payload.code !== 'string') return null;
  if (!payload.label || typeof payload.label !== 'string') return null;
  if (!payload.description || typeof payload.description !== 'string') return null;
  if (payload.type !== 'percent' && payload.type !== 'flat') return null;
  if (typeof payload.value !== 'number' || Number.isNaN(payload.value) || payload.value < 0) return null;
  if (payload.type === 'percent' && payload.value > 100) return null;

  const appliesTo: PromoPayload['appliesTo'] = {};
  if (payload.appliesTo?.plans) {
    const plans = payload.appliesTo.plans.filter(isPlanKey);
    if (plans.length > 0) appliesTo.plans = plans;
  }
  if (payload.appliesTo?.cycles) {
    const cycles = payload.appliesTo.cycles.filter(isCycle);
    if (cycles.length > 0) appliesTo.cycles = cycles;
  }
  if (payload.appliesTo?.methods) {
    const methods = payload.appliesTo.methods.filter(isPaymentMethod);
    if (methods.length > 0) appliesTo.methods = methods;
  }

  return {
    code: payload.code,
    label: payload.label,
    description: payload.description,
    type: payload.type,
    value: Math.round(payload.value),
    appliesTo,
    stackableWithReferral: payload.stackableWithReferral ?? false,
    notes: payload.notes,
    isActive: payload.isActive ?? true,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListResponse | CreateResponse>) {
  const { user } = await requireRole(req, ['admin']);

  if (req.method === 'GET') {
    const { data, error } = await supabaseService
      .from('admin_promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return res.status(500).json({ ok: false, error: error?.message ?? 'SERVER_ERROR' });
    }

    return res.status(200).json({ ok: true, data: data.map((row) => mapRowToPromoRule(row as any)) });
  }

  if (req.method === 'POST') {
    const parsed = validatePayload(req.body);
    if (!parsed) {
      return res.status(400).json({ ok: false, error: 'BAD_INPUT' });
    }

    const normalizedCode = normalizePromoCode(parsed.code);
    if (!normalizedCode) {
      return res.status(400).json({ ok: false, error: 'BAD_INPUT' });
    }

    const insertPayload: Record<string, unknown> = {
      code: normalizedCode,
      label: parsed.label.trim(),
      description: parsed.description.trim(),
      type: parsed.type,
      value: parsed.value,
      stackable_with_referral: parsed.stackableWithReferral ?? false,
      notes: parsed.notes ?? null,
      is_active: parsed.isActive ?? true,
      created_by: user.id,
    };

    if (parsed.appliesTo && Object.keys(parsed.appliesTo).length > 0) {
      insertPayload.applies_plans = parsed.appliesTo.plans ?? null;
      insertPayload.applies_cycles = parsed.appliesTo.cycles ?? null;
      insertPayload.applies_methods = parsed.appliesTo.methods ?? null;
    }

    const { data, error } = await supabaseService
      .from('admin_promo_codes')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ ok: false, error: 'DUPLICATE' });
      }
      return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }

    return res.status(201).json({ ok: true, data: mapRowToPromoRule(data as any) });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
