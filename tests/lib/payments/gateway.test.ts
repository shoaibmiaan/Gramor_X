import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/payments/easypaisa', () => ({
  initiateEasypaisa: vi.fn(async () => ({
    url: 'https://example.test/easypaisa',
    sessionId: 'ep_session',
  })),
}));

vi.mock('@/lib/payments/jazzcash', () => ({
  initiateJazzCash: vi.fn(async () => ({
    url: 'https://example.test/jazzcash',
    sessionId: 'jc_session',
  })),
}));

vi.mock('@/lib/payments/safepay', () => ({
  initiateSafepay: vi.fn(async () => ({
    url: 'https://example.test/safepay',
    sessionId: 'sp_session',
  })),
}));

import { createGatewayIntent } from '@/lib/payments/gateway';

const baseInput = {
  plan: 'starter' as const,
  cycle: 'monthly' as const,
  origin: 'https://app.test',
  userId: 'user_1',
  amountCents: 900,
  intentId: 'intent_1',
  currency: 'PKR' as const,
};

describe('createGatewayIntent integration checks', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDevPayments = process.env.NEXT_PUBLIC_DEV_PAYMENTS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_DEV_PAYMENTS = originalDevPayments;
  });

  it('blocks partial providers in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_DEV_PAYMENTS = '0';

    await expect(
      createGatewayIntent({
        ...baseInput,
        provider: 'easypaisa',
      }),
    ).rejects.toThrow('partial and unavailable in production');
  });

  it('allows partial provider dev fallback only when NEXT_PUBLIC_DEV_PAYMENTS=1', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_DEV_PAYMENTS = '0';

    await expect(
      createGatewayIntent({
        ...baseInput,
        provider: 'jazzcash',
      }),
    ).rejects.toThrow('partial and unavailable in production');

    process.env.NEXT_PUBLIC_DEV_PAYMENTS = '1';

    await expect(
      createGatewayIntent({
        ...baseInput,
        provider: 'jazzcash',
      }),
    ).resolves.toMatchObject({
      provider: 'jazzcash',
      url: 'https://example.test/jazzcash',
      sessionId: 'jc_session',
    });
  });
});
