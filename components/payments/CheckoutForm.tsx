import * as React from 'react';

import { startCheckout } from '@/lib/payments/index';
import type { PlanKey, Cycle, PaymentMethod } from '@/types/payments';

export type CheckoutFormProps = {
  plan: PlanKey;
  billingCycle?: Cycle;
  referralCode?: string;
  promoCode?: string;
  methods?: PaymentMethod[]; // default: all
  className?: string;
  onError?: (msg: string) => void;
};

export default function CheckoutForm({
  plan,
  billingCycle = 'monthly',
  referralCode,
  promoCode,
  methods = ['stripe', 'crypto', 'easypaisa', 'jazzcash'],
  className = '',
  onError,
}: CheckoutFormProps) {
  const [loading, setLoading] = React.useState<PaymentMethod | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const start = React.useCallback(async (method: PaymentMethod) => {
    setErr(null);
    setLoading(method);

    try {
      const result = await startCheckout(method, { plan, referralCode, billingCycle, promoCode });
      if (!result.ok) {
        const message = result.error || `Failed to start ${method} checkout`;
        setErr(message);
        onError?.(message);
        setLoading(null);
        return;
      }

      if ('manual' in result && result.manual) {
        window.location.href = '/account/billing?due=1';
        return;
      }

      if ('url' in result && result.url) {
        window.location.href = result.url;
        return;
      }

      const fallbackMessage = `Failed to start ${method} checkout`;
      setErr(fallbackMessage);
      onError?.(fallbackMessage);
      setLoading(null);
      return;
    } catch (e) {
      const message = (e as Error).message;
      setErr(message);
      onError?.(message);
      setLoading(null);
    }
  }, [plan, referralCode, billingCycle, promoCode, onError]);

  return (
    <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
      {methods.includes('stripe') && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-1 text-h4 font-medium">Pay by Card</h3>
          <p className="mb-4 text-small text-muted-foreground">Visa, MasterCard</p>
          <button
            type="button"
            onClick={() => start('stripe')}
            disabled={loading !== null}
            className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {loading === 'stripe' ? 'Starting…' : 'Continue with Card'}
          </button>
        </div>
      )}

      {methods.includes('easypaisa') && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-1 text-h4 font-medium">Easypaisa</h3>
          <p className="mb-4 text-small text-muted-foreground">Pakistan local payments</p>
          <button
            type="button"
            onClick={() => start('easypaisa')}
            disabled={loading !== null}
            className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {loading === 'easypaisa' ? 'Starting…' : 'Pay with Easypaisa'}
          </button>
        </div>
      )}

      {methods.includes('jazzcash') && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-1 text-h4 font-medium">JazzCash</h3>
          <p className="mb-4 text-small text-muted-foreground">Pakistan local payments</p>
          <button
            type="button"
            onClick={() => start('jazzcash')}
            disabled={loading !== null}
            className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {loading === 'jazzcash' ? 'Starting…' : 'Pay with JazzCash'}
          </button>
        </div>
      )}

      {methods.includes('crypto') && (
        <div className="rounded-xl border border-border p-4 md:col-span-3 lg:col-span-1">
          <h3 className="mb-1 text-h4 font-medium">Pay with Crypto</h3>
          <p className="mb-4 text-small text-muted-foreground">Bitcoin, Ethereum, USDT (manual confirmation)</p>
          <button
            type="button"
            onClick={() => start('crypto')}
            disabled={loading !== null}
            className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {loading === 'crypto' ? 'Preparing…' : 'Continue with Crypto'}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            You&apos;ll see wallet details and submit proof after initiating the crypto checkout.
          </p>
        </div>
      )}

      {err ? (
        <div className="md:col-span-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-small">
          <p className="font-medium">Checkout error</p>
          <p className="opacity-90">{err}</p>
        </div>
      ) : null}
    </div>
  );
}
