// lib/payments/gateway.ts
import { env } from '@/lib/env';
import { getPlanBillingAmount, type Cycle, type PlanKey } from '@/lib/pricing';
import { initiateEasypaisa } from '@/lib/payments/easypaisa';
import { initiateJazzCash } from '@/lib/payments/jazzcash';

const CRYPTO_CHECKOUT_PATH = '/checkout/crypto';

export type PaymentProvider = 'stripe' | 'easypaisa' | 'jazzcash' | 'crypto';

export type GatewayIntent = Readonly<{
  provider: PaymentProvider;
  url: string;
  sessionId?: string | null;
}>;

export type CreateGatewayIntentInput = Readonly<{
  provider: PaymentProvider;
  plan: PlanKey;
  cycle: Cycle;
  origin: string;
  userId: string;
  referralCode?: string;
  promoCode?: string;
  amountCents: number;
  intentId: string;
}>;

export function amountInCents(plan: PlanKey, cycle: Cycle): number {
  const major = getPlanBillingAmount(plan, cycle);
  return Math.round(major * 100);
}

const stripePriceMap: Record<PlanKey, Record<Cycle, string | undefined>> = {
  starter: {
    monthly: env.STRIPE_PRICE_STARTER_MONTHLY,
    annual: env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  booster: {
    monthly: env.STRIPE_PRICE_BOOSTER_MONTHLY,
    annual: env.STRIPE_PRICE_BOOSTER_ANNUAL,
  },
  master: {
    monthly: env.STRIPE_PRICE_MASTER_MONTHLY,
    annual: env.STRIPE_PRICE_MASTER_ANNUAL,
  },
};

async function createStripeCheckout(input: CreateGatewayIntentInput): Promise<GatewayIntent> {
  const priceId = stripePriceMap[input.plan][input.cycle];
  if (!env.STRIPE_SECRET_KEY || !priceId) {
    throw new Error('Stripe not configured');
  }

  // @ts-expect-error dependency may not be installed in all environments
  const Stripe = (await import('stripe')).default ?? (await import('stripe'));
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const successUrl = `${input.origin}/account/billing?success=1&plan=${input.plan}`;
  const cancelUrl = `${input.origin}/pricing?canceled=1&plan=${input.plan}${
    input.referralCode ? `&code=${encodeURIComponent(input.referralCode)}` : ''
  }${input.promoCode ? `&promo=${encodeURIComponent(input.promoCode)}` : ''}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: input.userId,
      metadata: {
        plan: input.plan,
        billingCycle: input.cycle,
        referralCode: input.referralCode || '',
        userId: input.userId,
        promoCode: input.promoCode || '',
      },
      subscription_data: {
        metadata: {
          plan: input.plan,
          billingCycle: input.cycle,
          referralCode: input.referralCode || '',
          userId: input.userId,
          promoCode: input.promoCode || '',
        },
      },
    },
    {
      idempotencyKey: `${input.userId}:${input.plan}:${input.cycle}:${input.referralCode ?? ''}`,
    },
  );

  return { provider: 'stripe', url: session.url ?? successUrl, sessionId: session.id };
}

async function createLocalSession(input: CreateGatewayIntentInput): Promise<GatewayIntent> {
  if (input.provider === 'easypaisa') {
    const session = await initiateEasypaisa(input.origin, input.plan, input.cycle);
    return { provider: 'easypaisa', url: session.url, sessionId: session.sessionId };
  }
  const session = await initiateJazzCash(input.origin, input.plan, input.cycle);
  return { provider: 'jazzcash', url: session.url, sessionId: session.sessionId };
}

function createCryptoCheckout(input: CreateGatewayIntentInput): GatewayIntent {
  const params = new URLSearchParams({
    intent: input.intentId,
    plan: input.plan,
    cycle: input.cycle,
    amount: String(input.amountCents),
  });
  if (input.referralCode) {
    params.set('code', input.referralCode);
  }
  if (input.promoCode) {
    params.set('promo', input.promoCode);
  }
  const url = `${input.origin}${CRYPTO_CHECKOUT_PATH}?${params.toString()}`;
  return { provider: 'crypto', url, sessionId: input.intentId };
}

export async function createGatewayIntent(input: CreateGatewayIntentInput): Promise<GatewayIntent> {
  if (input.provider === 'stripe') {
    return createStripeCheckout(input);
  }
  if (input.provider === 'crypto') {
    return createCryptoCheckout(input);
  }
  return createLocalSession(input);
}
