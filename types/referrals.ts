// types/referrals.ts
export type ReferralCode = string;

export type ReferralSummary = Readonly<{
  code?: ReferralCode | null;
  balance: number;
  lifetimeEarned: number;
  totalReferrals: number;
  approvedReferrals: number;
  pendingReferrals: number;
}>;

export type CreateReferralResponse =
  | Readonly<{
      ok: true;
      code: ReferralCode;
      balance: number;
      lifetimeEarned: number;
      totalReferrals: number;
    }>
  | Readonly<{ ok: false; error: string }>;

export type RedeemBody = Readonly<{
  code: ReferralCode;
  context?: 'signup' | 'checkout' | 'account';
  deviceFingerprint?: string | null;
}>;

export type RedeemResponse =
  | Readonly<{ ok: true; awarded: number; referrerAwarded: number; balance: number }>
  | Readonly<{ ok: false; error: string }>;

export type StatsResponse =
  | Readonly<{ ok: true; stats: ReferralSummary }>
  | Readonly<{ ok: false; error: string }>;

export type ReferralStatus = 'pending' | 'approved' | 'rejected';
