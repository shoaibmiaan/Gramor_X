import crypto from 'node:crypto';

import { env } from '@/lib/env';
import type { Cycle, PlanKey } from './index';

export type SafepaySession = Readonly<{ url: string; sessionId: string }>;

type InitiateSafepayInput = Readonly<{
  origin: string;
  plan: PlanKey;
  cycle: Cycle;
  amountCents: number;
  currency: 'PKR' | 'USD';
  intentId: string;
}>;

const DEFAULTS = {
  sandbox: {
    apiBase: 'https://sandbox.api.getsafepay.com',
    checkoutBase: 'https://sandbox.api.getsafepay.com/components',
  },
  production: {
    apiBase: 'https://api.getsafepay.com',
    checkoutBase: 'https://getsafepay.com/components',
  },
} as const;

const SAFEPAY_ENV = env.SAFEPAY_ENV === 'production' ? 'production' : 'sandbox';

function getApiBase(): string {
  return env.SAFEPAY_API_BASE_URL || DEFAULTS[SAFEPAY_ENV].apiBase;
}

function getCheckoutBase(): string {
  return env.SAFEPAY_CHECKOUT_BASE_URL || DEFAULTS[SAFEPAY_ENV].checkoutBase;
}

function roundCentsToMajor(cents: number): number {
  return Math.round((cents / 100) * 100) / 100;
}

export function isSafepayConfigured(): boolean {
  return Boolean(env.SAFEPAY_PUBLIC_KEY && env.SAFEPAY_SECRET_KEY);
}

export function devSafepaySession(origin: string, plan: PlanKey, _cycle: Cycle): SafepaySession {
  const sid = `sp_dev_${Date.now()}`;
  return { url: `${origin}/checkout/success?session_id=${sid}&plan=${plan}`, sessionId: sid };
}

function buildCheckoutUrl(sessionId: string, params: { orderId: string; redirectUrl: string; cancelUrl: string }): string {
  const search = new URLSearchParams({
    env: SAFEPAY_ENV,
    beacon: sessionId,
    order_id: params.orderId,
    source: 'custom',
    redirect_url: params.redirectUrl,
    cancel_url: params.cancelUrl,
  });
  return `${getCheckoutBase()}?${search.toString()}`;
}

/** Initiate a Safepay payment session */
export async function initiateSafepay(input: InitiateSafepayInput): Promise<SafepaySession> {
  if (!isSafepayConfigured() || env.NEXT_PUBLIC_DEV_PAYMENTS) {
    return devSafepaySession(input.origin, input.plan, input.cycle);
  }

  const amount = roundCentsToMajor(input.amountCents);
  const response = await fetch(`${getApiBase()}/order/v1/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      environment: SAFEPAY_ENV,
      client: env.SAFEPAY_PUBLIC_KEY,
      amount,
      currency: input.currency,
    }),
  });

  if (!response.ok) {
    throw new Error(`Safepay order init failed (${response.status})`);
  }

  const payload = (await response.json()) as { data?: { token?: string; tracker?: string } };
  const sessionId = String(payload?.data?.token || payload?.data?.tracker || '').trim();
  if (!sessionId) {
    throw new Error('Safepay response missing session token');
  }

  const redirectUrl = `${input.origin}/api/payments/webhooks/safepay?plan=${encodeURIComponent(
    input.plan,
  )}&cycle=${encodeURIComponent(input.cycle)}`;
  const cancelUrl = `${input.origin}/pricing?canceled=1&plan=${encodeURIComponent(
    input.plan,
  )}&provider=safepay`;

  return {
    sessionId,
    url: buildCheckoutUrl(sessionId, { orderId: `gx_${input.intentId}`, redirectUrl, cancelUrl }),
  };
}

/** Verify Safepay payment notification/webhook */
export async function verifySafepay(payload: unknown): Promise<boolean> {
  if (!isSafepayConfigured() || env.NEXT_PUBLIC_DEV_PAYMENTS) {
    return true;
  }

  const data = payload as Record<string, unknown> | null;
  const tracker = String((data?.tracker ?? data?.beacon ?? data?.token ?? '') || '').trim();
  const signature = String((data?.sig ?? data?.signature ?? data?.order_signature ?? '') || '').trim();
  if (!tracker || !signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', env.SAFEPAY_SECRET_KEY as string).update(tracker).digest('hex');
  return expected === signature;
}
