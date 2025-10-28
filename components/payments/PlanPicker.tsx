// components/PlanPicker.tsx
import * as React from 'react';

import { startCheckout as startCheckoutRequest } from '@/lib/payments/index';
import type { Cycle, PaymentMethod, PlanKey } from '@/types/payments';

export type Plan = Readonly<{
  key: PlanKey;
  title: string;
  subtitle?: string;
  priceMonthly: number; // display currency major units
  priceAnnual: number; // discounted display (per month equivalent if you prefer)
  features: string[];
  badge?: string;
  mostPopular?: boolean;
}>;

export type PlanPickerProps = {
  plans?: Plan[];
  defaultCycle?: Cycle;
  className?: string;
  onSelect?: (plan: PlanKey, cycle: Cycle) => void;
  methods?: PaymentMethod[];
  referralCode?: string;
  promoCode?: string;
};

const DEFAULT_PLANS: Plan[] = [
  {
    key: 'starter',
    title: 'Seedling',
    subtitle: 'Essentials to get started',
    priceMonthly: 9,
    priceAnnual: 8,
    features: ['Daily vocab', '1 grammar drill/week', 'Community access'],
  },
  {
    key: 'booster',
    title: 'Rocket',
    subtitle: 'Best for fast progress',
    priceMonthly: 19,
    priceAnnual: 16,
    features: ['All IELTS modules', 'AI feedback', 'Mock tests', 'Progress analytics'],
    badge: 'Most popular',
    mostPopular: true,
  },
  {
    key: 'master',
    title: 'Owl',
    subtitle: 'Advanced & coaching',
    priceMonthly: 39,
    priceAnnual: 35,
    features: ['Priority support', '1:1 reviews', 'Advanced drills'],
  },
];

const PROVIDER_LABEL: Record<PaymentMethod, string> = {
  stripe: 'Card',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  crypto: 'Crypto',
};

export default function PlanPicker({
  plans = DEFAULT_PLANS,
  defaultCycle = 'monthly',
  className = '',
  onSelect,
  methods,
  referralCode,
  promoCode,
}: PlanPickerProps) {
  const [cycle, setCycle] = React.useState<Cycle>(defaultCycle);
  const [busyKey, setBusyKey] = React.useState<PlanKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const availableMethods = React.useMemo<PaymentMethod[]>(() => {
    if (onSelect) return [];
    if (methods && methods.length > 0) return methods;
    return ['stripe'];
  }, [methods, onSelect]);

  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>(() => availableMethods[0] ?? 'stripe');

  React.useEffect(() => {
    if (availableMethods.length === 0) return;
    if (!availableMethods.includes(selectedMethod)) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  const showMethodPicker = !onSelect && availableMethods.length > 1;

  const handlePlanAction = React.useCallback(
    async (planKey: PlanKey) => {
      if (onSelect) {
        onSelect(planKey, cycle);
        return;
      }

      const provider = selectedMethod ?? availableMethods[0];
      if (!provider) {
        setError('No payment methods available right now.');
        return;
      }

      const providerName = PROVIDER_LABEL[provider] ?? provider;

      setError(null);
      setBusyKey(planKey);

      try {
        const result = await startCheckoutRequest(provider, {
          plan: planKey,
          billingCycle: cycle,
          referralCode,
          promoCode,
        });

        if (!result.ok) {
          throw new Error(result.error || `Checkout failed via ${providerName}`);
        }

        if ('manual' in result && result.manual) {
          window.location.assign('/account/billing?due=1');
          return;
        }

        if ('url' in result && result.url) {
          window.location.assign(result.url);
          return;
        }

        throw new Error(`No redirect URL returned for ${providerName}`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusyKey(null);
      }
    },
    [availableMethods, cycle, onSelect, referralCode, selectedMethod, promoCode],
  );

  return (
    <section className={`w-full ${className}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border p-1">
          {(['monthly', 'annual'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCycle(k)}
              className={[
                'px-4 py-2 rounded-lg text-small',
                cycle === k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              ].join(' ')}
            >
              {k === 'monthly' ? 'Monthly' : 'Annual (save)'}
            </button>
          ))}
        </div>

        {showMethodPicker ? (
          <label className="flex items-center gap-2 text-small text-muted-foreground">
            <span>Pay with</span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-small"
              value={selectedMethod}
              onChange={(event) => setSelectedMethod(event.target.value as PaymentMethod)}
            >
              {availableMethods.map((method) => (
                <option key={method} value={method}>
                  {PROVIDER_LABEL[method]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const price = cycle === 'monthly' ? p.priceMonthly : p.priceAnnual;
          const busy = busyKey === p.key;
          const actionLabel = busy
            ? 'Please wait…'
            : onSelect
            ? `Choose ${p.title}`
            : `Continue with ${PROVIDER_LABEL[selectedMethod] ?? selectedMethod}`;

          return (
            <div
              key={p.key}
              className={[
                'relative rounded-2xl border border-border p-5',
                p.mostPopular ? 'ring-2 ring-primary' : '',
              ].join(' ')}
            >
              {p.badge ? (
                <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-caption font-medium text-primary-foreground shadow">
                  {p.badge}
                </div>
              ) : null}

              <h3 className="text-h4 font-semibold">{p.title}</h3>
              {p.subtitle ? (
                <p className="text-small text-muted-foreground">{p.subtitle}</p>
              ) : null}

              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-h1 font-semibold">
                    {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)}
                  </span>
                  <span className="text-small text-muted-foreground">/ {cycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-small">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => void handlePlanAction(p.key)}
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-small font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                aria-busy={busy}
              >
                {actionLabel}
              </button>

              {!onSelect ? (
                <p className="mt-2 text-caption text-muted-foreground">
                  Pay with {PROVIDER_LABEL[selectedMethod] ?? selectedMethod}
                </p>
              ) : null}
            </div>
          );
        })}

        {error ? (
          <div className="md:col-span-3 rounded-xl p-3 ring-1 ring-red-500/40">
            <div className="text-sm">{error}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
