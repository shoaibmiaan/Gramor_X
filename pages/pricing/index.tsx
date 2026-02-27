// pages/pricing/overview.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Ribbon } from '@/components/design-system/Ribbon';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import SocialProofStrip from '@/components/marketing/SocialProofStrip';
import QuotaSummary from '@/components/paywall/QuotaSummary';
import {
  getPlanDisplayPrice,
  type Cycle,
  type PlanKey,
} from '@/lib/pricing';
import type { Reason } from '@/lib/paywall/redirect';

// ------------------ Types ------------------
type PlanRow = {
  key: PlanKey;
  title: 'Seedling' | 'Rocket' | 'Owl';
  subtitle: string;
  // NOTE: Both monthly and annual are expressed as *per-month* USD cents.
  priceMonthly: number; // cents (USD)
  priceAnnual: number;  // cents (USD, per month when billed annually)
  features: string[];
  badge?: string;
  mostPopular?: boolean;
  icon: string; // fontawesome key
};

type Currency =
  | 'USD' | 'EUR' | 'GBP' | 'INR' | 'PKR' | 'AED' | 'SAR' | 'AUD' | 'CAD' | 'NGN' | 'BRL' | 'PHP';

// ------------------ Data ------------------
const PLAN_PRESENTATION: Record<PlanKey, Omit<PlanRow, 'key' | 'priceMonthly' | 'priceAnnual'>> = {
  starter: {
    title: 'Seedling',
    subtitle: 'Essentials to get started',
    features: ['Daily vocab', '1 grammar drill/week', 'Community access'],
    icon: 'fa-seedling',
  },
  booster: {
    title: 'Rocket',
    subtitle: 'Best for fast progress',
    features: ['All IELTS modules', 'AI feedback', 'Mock tests', 'Progress analytics'],
    badge: 'MOST POPULAR',
    mostPopular: true,
    icon: 'fa-rocket',
  },
  master: {
    title: 'Owl',
    subtitle: 'Advanced & coaching',
    features: ['Priority support', '1:1 reviews', 'Advanced drills'],
    icon: 'fa-feather',
  },
};

const toUsdCents = (major: number) => Math.round(major * 100);

const PLAN_KEYS: readonly PlanKey[] = ['starter', 'booster', 'master'];

const PLANS: readonly PlanRow[] = PLAN_KEYS.map((key) => ({
  key,
  ...PLAN_PRESENTATION[key],
  priceMonthly: toUsdCents(getPlanDisplayPrice(key, 'monthly')),
  priceAnnual: toUsdCents(getPlanDisplayPrice(key, 'annual')),
})) as const;

// Simple demo FX rates relative to USD. Replace with live rates from your backend/payments provider.
const FX: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  INR: 84,
  PKR: 280,
  AED: 3.67,
  SAR: 3.75,
  AUD: 1.5,
  CAD: 1.35,
  NGN: 1600,
  BRL: 5.5,
  PHP: 57,
};

const ZERO_DECIMAL: Currency[] = ['PKR', 'INR', 'NGN'];

// ------------------ Helpers ------------------
const guessCurrency = (): Currency => {
  if (typeof window === 'undefined') return 'USD';
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const cc = (loc.split('-')[1] || '').toUpperCase();
    const map: Partial<Record<string, Currency>> = {
      GB: 'GBP', IN: 'INR', PK: 'PKR', AE: 'AED', SA: 'SAR', AU: 'AUD', CA: 'CAD', NG: 'NGN', BR: 'BRL', PH: 'PHP',
      IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR'
    };
    return (map[cc] as Currency) || 'USD';
  } catch {
    return 'USD';
  }
};

const formatMoneyFromUsdCents = (usdCents: number, currency: Currency) => {
  const fx = FX[currency] || 1;
  const raw = (usdCents / 100) * fx; // base is USD per-month
  const maximumFractionDigits = ZERO_DECIMAL.includes(currency) ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits,
    }).format(raw);
  } catch {
    const sym: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', INR: '₹', PKR: '₨', AED: 'د.إ', SAR: '﷼', AUD: 'A$', CAD: 'C$', NGN: '₦', BRL: 'R$', PHP: '₱',
    };
    const s = sym[currency] ?? '$';
    return `${s}${ZERO_DECIMAL.includes(currency) ? Math.round(raw) : raw.toFixed(2)}`;
  }
};

// ------------------ Page ------------------
const PricingPage: NextPage = () => {
  const router = useRouter();
  const referralCode = React.useMemo(
    () => (router.query.code ? String(router.query.code) : undefined),
    [router.query]
  );

  const [cycle, setCycle] = React.useState<Cycle>('monthly');
  const [currency, setCurrency] = React.useState<Currency>('USD');
  const [timezone, setTimezone] = React.useState<string>('—');

  // --- Reason banner (e.g., quota reached) ---
  const reason: Reason = typeof router.query.reason === 'string' ? (router.query.reason as Reason) : 'unknown';
  const need: PlanKey | null = typeof router.query.need === 'string' ? (router.query.need as PlanKey) : null;
  const from: string = typeof router.query.from === 'string' ? router.query.from : '/';
  const qk: string | null = typeof router.query.qk === 'string' ? router.query.qk : null;

  React.useEffect(() => {
    setCurrency(guessCurrency());
    try { setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || '—'); } catch { /* noop */ }
  }, []);

  const handleSelect = React.useCallback(
    (planKey: PlanKey) => {
      const qs = new URLSearchParams();
      qs.set('plan', planKey);
      qs.set('billingCycle', cycle);
      if (referralCode) qs.set('code', referralCode);
      qs.set('currency', currency);
      void router.push(`/checkout?${qs.toString()}`);
    },
    [cycle, referralCode, router, currency]
  );

  const getBanner = () => {
    if (reason === 'unknown') return null;

    let message = '';
    let backPath = from;
    let module = qk ? qk.replace(/_/g, ' ') : 'this feature';

    switch (reason) {
      case 'plan_required':
        message = `This feature requires the ${need || 'higher'} plan or higher.`;
        break;
      case 'quota_limit':
        message = `You've reached your quota for ${module}. Try again tomorrow or upgrade to increase your limits.`;
        break;
      case 'trial_ended':
        message = 'Your trial has ended. Upgrade to continue.';
        break;
      default:
        return null;
    }

    return (
      <div
        className="mx-auto mb-4 max-w-4xl rounded-2xl border border-amber-400/50 bg-amber-100/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <strong>{message}</strong>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={backPath}
              className="inline-flex items-center justify-center rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-sm underline-offset-4 hover:underline"
            >
              Back
            </Link>
            <Link
              href="#plans"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-95"
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Pricing — GramorX</title>
        <meta
          name="description"
          content="Premium global pricing for GramorX IELTS — multi-currency, timezone-aware, and conversion-optimized."
        />
      </Head>

      {/* MAIN landmark */}
      <main role="main" className="min-h-screen bg-marketing-aurora text-foreground antialiased">
        <Section id="pricing">
          <Container className="pt-6 md:pt-8 pb-12 md:pb-16" aria-labelledby="pricing-title">

            {/* Context banner (from redirects with query params) */}
            {getBanner()}

            {/* Quota Summary if applicable */}
            {reason === 'quota_limit' && <QuotaSummary qk={qk} />}

            {/* Top utility bar */}
            <div className="mx-auto max-w-7xl mb-4 flex items-center justify-between gap-3 text-small">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 text-indigo-700 px-2.5 py-1 font-medium dark:text-indigo-300">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.21l8.2-1.192L12 .587z"/>
                  </svg>
                  4.8★ • 12k reviews
                </span>
                <span className="hidden md:inline text-muted-foreground">Trusted by learners in 90+ countries</span>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="currency" className="sr-only">Currency</label>
                <div className="inline-flex items-center gap-2 border rounded-lg px-2 py-1 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
                  <span className="text-muted-foreground">Currency</span>
                  <select
                    id="currency"
                    className="bg-transparent outline-none"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                  >
                    {(Object.keys(FX) as Currency[]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Hero */}
            <header className="text-center max-w-3xl mx-auto">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-[11px] md:text-caption text-muted-foreground bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
                Flexible plans • Cancel anytime
              </p>

              <h1 id="pricing-title" className="mt-3 md:mt-3 text-balance text-display md:text-displayLg font-semibold leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500">Choose your plan</span>
              </h1>

              <p className="mt-2 text-small md:text-body text-muted-foreground text-pretty">
                Upgrade for full IELTS modules, AI evaluation, and performance analytics.
              </p>
              <div className="mt-2 text-caption text-muted-foreground">Local timezone: <strong>{timezone}</strong></div>
            </header>

            <div className="mx-auto mt-6">
              <SocialProofStrip className="mx-auto" />
            </div>

            {/* Billing cycle + copy */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-full border border-border bg-card p-1 flex" role="tablist" aria-label="Billing cycle">
                <button
                  type="button"
                  className={`px-4 py-1.5 text-small rounded-full transition ${cycle === 'monthly' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCycle('monthly')}
                  aria-pressed={cycle === 'monthly'}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 text-small rounded-full transition ${cycle === 'annual' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCycle('annual')}
                  aria-pressed={cycle === 'annual'}
                >
                  Annual <span className="ml-1 opacity-80">(save ~2 months)</span>
                </button>
              </div>
              <span className="text-caption text-muted-foreground">Prices shown in {currency} before tax</span>
            </div>

            {/* Plans grid */}
            <section id="plans" aria-labelledby="plans-heading" className="mt-6 md:mt-8">
              <h2 id="plans-heading" className="sr-only">Plans and pricing options</h2>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                {PLANS.map((p) => {
                  const priceCentsUSD = cycle === 'monthly' ? p.priceMonthly : p.priceAnnual;
                  const priceLabel = formatMoneyFromUsdCents(priceCentsUSD, currency);
                  const periodLabel = cycle === 'monthly' ? 'per month' : 'per month (billed annually)';

                  const CardShell: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => (
                    <Card className={`p-7 rounded-2xl relative hover:-translate-y-2 transition hover:shadow-xl ${p.mostPopular ? 'ring-1 ring-fuchsia-400/40' : ''} ${className || ''}`}>
                      {children}
                    </Card>
                  );

                  const Inner = (
                    <>
                      <Badge variant={p.mostPopular ? 'accent' : 'info'} size="sm" className="absolute top-4 right-4">
                        {p.mostPopular ? 'FEATURED' : 'STANDARD'}
                      </Badge>

                      {p.badge && <Ribbon label={p.badge} variant="accent" position="top-right" />}

                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-white text-h2 bg-gradient-to-br from-purple-500 to-cyan-500">
                        <i className={`fas ${p.icon}`} aria-hidden="true" />
                        <span className="sr-only">{p.title} icon</span>
                      </div>

                      <h3 className="text-h3 font-semibold mb-1 flex items-center gap-2">
                        <i className="fas fa-circle-check text-success" aria-hidden="true" />
                        {p.title}
                      </h3>
                      <p className="text-small text-muted-foreground mb-3">{p.subtitle}</p>

                      <div className="mb-4">
                        <div className="font-slab text-displayLg bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500 leading-none">{priceLabel}</div>
                        <div className="text-muted-foreground mt-1">{periodLabel}</div>
                      </div>

                      <ul className="mt-2">
                        {p.features.map((f) => (
                          <li key={f} className="py-2 pl-6 border-b border-dashed border-purple-400/20 relative text-muted-foreground">
                            <span className="absolute left-0 top-2 text-success font-bold" aria-hidden="true">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 grid gap-3">
                        <Button
                          variant={p.mostPopular ? 'primary' : 'secondary'}
                          className="w-full justify-center"
                          onClick={() => handleSelect(p.key)}
                          aria-label={`Choose ${p.title} plan (${cycle})`}
                        >
                          Choose {p.title}
                        </Button>
                        <Link href="/waitlist" className="underline decoration-2 underline-offset-4 text-cyan-700 hover:opacity-90 text-small text-center">
                          Not ready? Join the pre-launch list
                        </Link>
                      </div>
                    </>
                  );

                  if (p.mostPopular) {
                    return (
                      <div key={p.key} className="p-[1px] rounded-2xl bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-cyan-500">
                        <CardShell className="bg-background">{Inner}</CardShell>
                      </div>
                    );
                  }
                  return <CardShell key={p.key}>{Inner}</CardShell>;
                })}
              </div>
            </section>

            {/* Extras / Support */}
            <section aria-labelledby="extras-heading" className="mt-10 grid gap-6 md:grid-cols-3">
              <h2 id="extras-heading" className="sr-only">Included features and helpful links</h2>

              <Card className="p-6 md:p-7 rounded-2xl">
                <h3 className="text-h4 font-medium">All plans include</h3>
                <ul className="mt-3 list-none space-y-2 text-small text-muted-foreground">
                  <li>Dark/Light UI • Fully responsive</li>
                  <li>Study calendar & streaks</li>
                  <li>Core IELTS practice sets</li>
                </ul>
              </Card>

              <Card className="p-6 md:p-7 rounded-2xl">
                <h3 className="text-h4 font-medium">Need a discount?</h3>
                <p className="mt-2 text-small text-muted-foreground">Have a referral code? You can apply it at checkout.</p>

                <Button
                  variant="primary"
                  className="mt-3 w-full justify-center"
                  onClick={() => {
                    const qs = new URLSearchParams();
                    qs.set('plan', 'booster');
                    qs.set('billingCycle', cycle);
                    qs.set('currency', currency);
                    if (referralCode) qs.set('code', referralCode);
                    void router.push(`/checkout?${qs.toString()}`);
                  }}
                  aria-label={`Continue to checkout with Rocket (${cycle})`}
                >
                  Continue to checkout
                </Button>

                <p className="mt-2 text-caption text-muted-foreground">
                  Or{' '}
                  <Link href="/account/referrals" className="underline decoration-2 underline-offset-4 hover:opacity-90">
                    generate your own code
                  </Link>
                  .
                </p>
              </Card>

              <Card className="p-6 md:p-7 rounded-2xl">
                <h3 className="text-h4 font-medium">Questions?</h3>
                <ul className="mt-3 list-none space-y-2 text-small text-muted-foreground">
                  <li>
                    <Link href="/legal/terms" className="underline decoration-2 underline-offset-4 hover:opacity-90">Billing & refunds</Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="underline decoration-2 underline-offset-4 hover:opacity-90">Privacy & data</Link>
                  </li>
                  <li>
                    <Link href="/contact" className="underline decoration-2 underline-offset-4 hover:opacity-90">Contact support</Link>
                  </li>
                </ul>
              </Card>
            </section>

            <footer className="mt-8 md:mt-10 text-center text-small text-muted-foreground">
              Prices shown are indicative; taxes may apply at checkout.
            </footer>
          </Container>
        </Section>
      </main>
    </>
  );
};

export default PricingPage;