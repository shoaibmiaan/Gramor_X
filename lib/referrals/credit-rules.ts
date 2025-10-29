// lib/referrals/credit-rules.ts
// Deterministic referral rewards and helpers shared across API + UI.

export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_MIN_LENGTH = 6;
export const REFERRAL_CODE_MAX_LENGTH = 8;
export const MAX_DEVICE_REDEMPTIONS = 1;

export type ReferralCredits = Readonly<{ referrer: number; referred: number }>;

export type CreditRuleContext = Readonly<{
  /** Total completed redemptions for the referrer prior to this attempt. */
  completedReferrals: number;
}>;

const CREDIT_TIERS: Array<{ cap: number; credits: ReferralCredits }> = [
  { cap: 3, credits: { referrer: 80, referred: 20 } },
  { cap: 10, credits: { referrer: 50, referred: 14 } },
  { cap: Number.POSITIVE_INFINITY, credits: { referrer: 30, referred: 10 } },
];

/** Pick tiered credits for a referrer based on how many friends they already brought in. */
export function creditsForContext(context: CreditRuleContext): ReferralCredits {
  const tier = CREDIT_TIERS.find((t) => context.completedReferrals < t.cap) ?? CREDIT_TIERS[CREDIT_TIERS.length - 1];
  return tier.credits;
}

export function clampCodeLength(len: number): number {
  if (Number.isNaN(len) || !Number.isFinite(len)) return REFERRAL_CODE_MAX_LENGTH;
  return Math.max(REFERRAL_CODE_MIN_LENGTH, Math.min(REFERRAL_CODE_MAX_LENGTH, Math.floor(len)));
}

export function generateReferralCode(length = REFERRAL_CODE_MAX_LENGTH): string {
  const len = clampCodeLength(length);
  let result = '';
  for (let i = 0; i < len; i += 1) {
    const idx = Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length);
    result += REFERRAL_CODE_ALPHABET[idx];
  }
  return result;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
