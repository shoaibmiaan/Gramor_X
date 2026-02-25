// lib/api/referrals.ts
import type {
  CreateReferralResponse,
  RedeemBody,
  RedeemResponse,
  StatsResponse,
} from '@/types/referrals';

export async function createReferralCode(): Promise<CreateReferralResponse> {
  const res = await fetch('/api/referrals/create-code', { method: 'POST' });
  return (await res.json()) as CreateReferralResponse;
}

export async function redeemReferral(body: RedeemBody): Promise<RedeemResponse> {
  const res = await fetch('/api/referrals/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as RedeemResponse;
}

export async function getReferralStats(): Promise<StatsResponse> {
  const res = await fetch('/api/referrals/stats');
  return (await res.json()) as StatsResponse;
}
