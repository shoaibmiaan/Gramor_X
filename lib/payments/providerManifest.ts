import type { PaymentProvider } from '@/lib/payments/gateway';

export type ProviderRolloutStatus = 'ga' | 'partial' | 'disabled';

export type ProviderCapabilities = Readonly<{
  supportsLiveInit: boolean;
  supportsWebhookVerification: boolean;
}>;

export type ProviderManifestEntry = Readonly<{
  status: ProviderRolloutStatus;
  modulePath: string;
  capabilities: ProviderCapabilities;
}>;

/**
 * Feature-status manifest for payment providers.
 */
export const PAYMENT_PROVIDER_MANIFEST: Record<PaymentProvider, ProviderManifestEntry> = {
  stripe: {
    status: 'ga',
    modulePath: 'lib/payments/stripe.ts',
    capabilities: {
      supportsLiveInit: true,
      supportsWebhookVerification: true,
    },
  },
  easypaisa: {
    status: 'partial',
    modulePath: 'lib/payments/easypaisa.ts',
    capabilities: {
      supportsLiveInit: false,
      supportsWebhookVerification: false,
    },
  },
  jazzcash: {
    status: 'partial',
    modulePath: 'lib/payments/jazzcash.ts',
    capabilities: {
      supportsLiveInit: false,
      supportsWebhookVerification: false,
    },
  },
  safepay: {
    status: 'ga',
    modulePath: 'lib/payments/safepay.ts',
    capabilities: {
      supportsLiveInit: true,
      supportsWebhookVerification: true,
    },
  },
  crypto: {
    status: 'ga',
    modulePath: 'lib/payments/gateway.ts',
    capabilities: {
      supportsLiveInit: true,
      supportsWebhookVerification: true,
    },
  },
};

export function isDevPaymentsEnabled(value: string | undefined = process.env.NEXT_PUBLIC_DEV_PAYMENTS): boolean {
  return value === '1';
}

export function isProviderSelectableInUi(provider: PaymentProvider): boolean {
  const entry = PAYMENT_PROVIDER_MANIFEST[provider];
  if (!entry) return false;

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return true;

  if (entry.status !== 'partial') return true;
  return isDevPaymentsEnabled();
}

export function assertProviderCanCreateIntent(provider: PaymentProvider): void {
  const entry = PAYMENT_PROVIDER_MANIFEST[provider];
  if (!entry) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const devPayments = isDevPaymentsEnabled();

  if (isProduction && entry.status === 'partial' && !devPayments) {
    throw new Error(`${provider} is partial and unavailable in production`);
  }

  if (isProduction && !devPayments) {
    if (!entry.capabilities.supportsLiveInit) {
      throw new Error(`${provider} does not support live init in production`);
    }
    if (!entry.capabilities.supportsWebhookVerification) {
      throw new Error(`${provider} does not support webhook verification in production`);
    }
  }
}
