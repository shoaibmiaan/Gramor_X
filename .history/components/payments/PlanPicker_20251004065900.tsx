// components/PlanPicker.tsx
import * as React from 'react';

type PlanKey = 'starter' | 'booster' | 'master';
type Cycle = 'monthly' | 'annual';

export type Plan = Readonly<{
  key: PlanKey;
  title: string;
  subtitle?: string;
  priceMonthly: number; // display currency major units
  priceAnnual: number;  // discounted display (per month equivalent if you prefer)
  features: string[];
  badge?: string;
  mostPopular?: boolean;
}>;

export type PlanPickerProps = {
  plans?: Plan[];
  defaultCycle?: Cycle;
  className?: string;
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

export default function PlanPicker({
  plans = DEFAULT_PLANS,
  defaultCycle = 'monthly',
  className = '',
}: PlanPickerProps) {
  const [cycle, setCycle] = React.useState<Cycle>(defaultCycle);
  const [busyKey, setBusyKey] = React.useState<PlanKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function startCheckout(plan: PlanKey) {
    setError(null);
    setBusyKey(plan);
    try {
      const r = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle: cycle }),
      });
      const j = (await r.json()) as { ok: boolean; url?: string; manual?: boolean; message?: string; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error || 'Checkout failed');

      if (j.manual) {
        // Manual path: plan provisioned + due recorded
        window.location.assign('/account/billing?due=1');
        return;
      }
      if (j.url) {
        window.location.assign(j.url);
        return;
      }
      throw new Error('No redirect URL returned');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className={`w-full ${className}`}>
      {/* Billing cycle toggle */}
      <div className="mb-6 inline-flex rounded-xl border border-border p-1">
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

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const price = cycle === 'monthly' ? p.priceMonthly : p.priceAnnual;
          const busy = busyKey === p.key;
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
                onClick={() => startCheckout(p.key)}
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-small font-medium text-primary-foreground hover:opacity-90"
                aria-busy={busy}
              >
                {busy ? 'Please wait…' : `Choose ${p.title}`}
              </button>
            </div>
          );
        })}

        {error && (
          <div className="md:col-span-3 rounded-xl p-3 ring-1 ring-red-500/40">
            <div className="text-sm">{error}</div>
          </div>
        )}
      </div>
    </section>
  );
}
