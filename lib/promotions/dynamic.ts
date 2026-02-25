import { supabaseService } from '@/lib/supabaseService';
import { normalizePromoCode, type PromoCodeRule } from '@/lib/promotions/codes';
import type { Cycle, PlanKey, PaymentMethod } from '@/types/payments';

export type AdminPromoCodeRow = Readonly<{
  id: string;
  code: string;
  label: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  applies_plans: PlanKey[] | null;
  applies_cycles: Cycle[] | null;
  applies_methods: PaymentMethod[] | null;
  stackable_with_referral: boolean | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}>;

const isPlanKey = (value: unknown): value is PlanKey =>
  value === 'starter' || value === 'booster' || value === 'master';

const isCycle = (value: unknown): value is Cycle => value === 'monthly' || value === 'annual';

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  value === 'stripe' || value === 'easypaisa' || value === 'jazzcash' || value === 'safepay' || value === 'crypto';

export const mapRowToPromoRule = (row: AdminPromoCodeRow): PromoCodeRule => {
  const appliesTo: PromoCodeRule['appliesTo'] = {};
  const plans = (row.applies_plans ?? []).filter(isPlanKey);
  const cycles = (row.applies_cycles ?? []).filter(isCycle);
  const methods = (row.applies_methods ?? []).filter(isPaymentMethod);

  if (plans.length > 0 || cycles.length > 0 || methods.length > 0) {
    appliesTo.plans = plans.length > 0 ? plans : undefined;
    appliesTo.cycles = cycles.length > 0 ? cycles : undefined;
    appliesTo.methods = methods.length > 0 ? methods : undefined;
  }

  return {
    code: normalizePromoCode(row.code),
    label: row.label,
    description: row.description,
    type: row.type,
    value: row.value,
    ...(Object.keys(appliesTo).length > 0 ? { appliesTo } : {}),
    stackableWithReferral: row.stackable_with_referral ?? undefined,
    notes: row.notes ?? undefined,
  };
};

export async function listActiveAdminPromos(): Promise<PromoCodeRule[]> {
  const { data, error } = await supabaseService
    .from('admin_promo_codes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapRowToPromoRule(row as AdminPromoCodeRow));
}

export async function getAdminPromoByCode(code: string): Promise<PromoCodeRule | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;

  const { data, error } = await supabaseService
    .from('admin_promo_codes')
    .select('*')
    .eq('code', normalized)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRowToPromoRule(data as AdminPromoCodeRow);
}
