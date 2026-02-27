// lib/promotions/client.ts
import { normalizePromoCode, type PromoCodeRule } from '@/lib/promotions/codes';

export async function fetchPromoByCode(code: string): Promise<PromoCodeRule | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;

  try {
    const res = await fetch(`/api/promotions/${encodeURIComponent(normalized)}`);
    if (!res.ok) {
      return null;
    }
    const payload = (await res.json()) as { ok: boolean; data?: PromoCodeRule };
    if (!payload.ok || !payload.data) {
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

export async function fetchActivePromos(): Promise<PromoCodeRule[]> {
  try {
    const res = await fetch('/api/promotions');
    if (!res.ok) {
      return [];
    }
    const payload = (await res.json()) as { ok: boolean; data?: PromoCodeRule[] };
    if (!payload.ok || !payload.data) {
      return [];
    }
    return payload.data;
  } catch {
    return [];
  }
}
