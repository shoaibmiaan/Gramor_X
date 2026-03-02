import type Stripe from 'stripe';
import type { PlanId } from '@/types/pricing';

export type SubscriptionPlan = PlanId;

export type SubscriptionPlanKey = 'free' | 'starter' | 'booster' | 'master';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'inactive'
  | 'expired'
  | 'none';

export type StripeSubscriptionStatus = Exclude<SubscriptionStatus, 'inactive' | 'expired' | 'none'>;

export type PlanDisplay = Readonly<{
  name: string;
  features: string[];
  price?: string;
}>;

export type Plan = Readonly<{
  id: SubscriptionPlanKey;
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
}>;

export type SubscriptionSummary = Readonly<{
  plan: SubscriptionPlanKey;
  status: StripeSubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
}>;

export type BillingInvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible';

export type BillingInvoice = Readonly<{
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl?: string;
  status: BillingInvoiceStatus;
}>;

export type DueRow = Readonly<{
  id: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  status: 'due' | 'collected' | 'canceled';
  plan_key: Exclude<SubscriptionPlanKey, 'free'>;
  cycle: 'monthly' | 'annual';
}>;

export type BillingSummaryResponse =
  | {
      ok: true;
      summary: SubscriptionSummary;
      invoices: BillingInvoice[];
      dues: DueRow[];
      customerId?: string;
      needsStripeSetup?: boolean;
    }
  | { ok: false; error: string };

export type PortalSummaryResponse = Readonly<{
  subscription: SubscriptionSummary;
  invoices: BillingInvoice[];
}>;

export type SubscriptionApiResponse = PortalSummaryResponse | Readonly<{ ok: false; error: string }>;

export type StripeSubscriptionLike = Stripe.Subscription | null | undefined;
