// pages/checkout/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';

// ✅ Correct import statements for named exports
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

// Other components
import PlanPicker, { type PlanPickerProps } from '@/components/payments/PlanPicker';
import CheckoutForm from '@/components/payments/CheckoutForm';
import RedeemBox, { type RedeemSuccessPayload } from '@/components/referrals/RedeemBox';
import PromoCodeBox, { type PromoCodeApplyPayload } from '@/components/payments/PromoCodeBox';
import SocialProofStrip from '@/components/marketing/SocialProofStrip';
import {
  PLAN_LABEL,
  PLANS as CANONICAL_PLANS,
  getPlanBillingAmount,
  getPlanDisplayPrice,
  type Cycle,
  type PlanKey,
} from '@/lib/pricing';
import {
  checkPromoEligibility,
  computePromoDiscount,
  findPromoByCode,
  normalizePromoCode,
  type PromoCodeRule,
} from '@/lib/promotions/codes';
import { fetchPromoByCode } from '@/lib/promotions/client';

const toUsdCents = (amount: number) => Math.round(amount * 100);

type PlanRow = {
  key: PlanKey;
  title: string;
  priceMonthly: number;
  priceAnnual: number;
  icon: string;
  mostPopular?: boolean;
  badge?: string;
};

const PLAN_KEYS: readonly PlanKey[] = ['starter', 'booster', 'master'];
const PLAN_ALIAS: Record<string, PlanKey> = {
  starter: 'starter',
  booster: 'booster',
  master: 'master',
  seedling: 'starter',
  rocket: 'booster',
  owl: 'master',
};

const createPlanRow = (key: PlanKey): PlanRow => {
  const plan = CANONICAL_PLANS[key];

  return {
    key,
    title: plan.title,
    priceMonthly: toUsdCents(getPlanDisplayPrice(key, 'monthly')),
    priceAnnual: toUsdCents(getPlanDisplayPrice(key, 'annual')),
    icon: plan.icon,
    mostPopular: plan.mostPopular,
    badge: plan.badge,
  };
};

const PLANS: Record<PlanKey, PlanRow> = {
  starter: createPlanRow('starter'),
  booster: createPlanRow('booster'),
  master: createPlanRow('master'),
};

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const CheckoutPage: NextPage = () => {
  const router = useRouter();
  const planParamRaw = router.query.plan;
  const planParam = Array.isArray(planParamRaw) ? planParamRaw[0] : planParamRaw;
  const codeParam = router.query.code ? String(router.query.code) : undefined;
  const promoParam = router.query.promo ? String(router.query.promo) : undefined;
  const cycleQuery = router.query.billingCycle ?? router.query.cycle ?? 'monthly';
  const cycleValue = Array.isArray(cycleQuery) ? cycleQuery[0] : cycleQuery;

  const normalizedPlanParam = planParam ? planParam.toLowerCase() : '';
  const plan = PLAN_ALIAS[normalizedPlanParam];

  const cycleParam = React.useMemo<Cycle>(() => {
    const normalized = (cycleValue ?? '').toString().toLowerCase();
    if (normalized === 'annual' || normalized === 'yearly') {
      return 'annual';
    }
    return 'monthly';
  }, [cycleValue]);

  const selectedPlanData = plan ? PLANS[plan] : undefined;

  const [activeCode, setActiveCode] = React.useState<string | undefined>(codeParam);
  const [activePromo, setActivePromo] = React.useState<PromoCodeRule | null>(null);

  React.useEffect(() => {
    setActiveCode(codeParam);
  }, [codeParam]);

  React.useEffect(() => {
    let aborted = false;
    if (!promoParam) {
      setActivePromo(null);
      return () => {
        aborted = true;
      };
    }
    const normalized = normalizePromoCode(promoParam);
    if (!normalized) {
      setActivePromo(null);
      return () => {
        aborted = true;
      };
    }

    const resolvePromo = async () => {
      const localRule = findPromoByCode(normalized);
      const rule = localRule ?? (await fetchPromoByCode(normalized));
      if (aborted) return;
      if (!rule) {
        setActivePromo(null);
        return;
      }
      const eligibility = checkPromoEligibility(rule, { plan, cycle: cycleParam });
      if (!eligibility.ok) {
        setActivePromo(null);
        return;
      }
      setActivePromo(rule);
    };

    void resolvePromo();

    return () => {
      aborted = true;
    };
  }, [promoParam, plan, cycleParam]);

  const buildQuery = React.useCallback(
    (overrides: Partial<{ plan: PlanKey | null; cycle: Cycle; referral: string | null; promo: string | null }> = {}) => {
      const nextQuery: Record<string, string | string[]> = { ...router.query };
      const nextPlan = overrides.plan === undefined ? plan : overrides.plan;
      const nextCycle = overrides.cycle ?? cycleParam;
      if (nextPlan) {
        nextQuery.plan = nextPlan;
        nextQuery.billingCycle = nextCycle;
      } else {
        delete nextQuery.plan;
        delete nextQuery.billingCycle;
      }
      const nextReferral = overrides.referral === undefined ? activeCode : overrides.referral;
      if (nextReferral) {
        nextQuery.code = nextReferral;
      } else {
        delete nextQuery.code;
      }
      const nextPromo = overrides.promo === undefined ? activePromo?.code : overrides.promo;
      if (nextPromo) {
        nextQuery.promo = nextPromo;
      } else {
        delete nextQuery.promo;
      }
      return nextQuery;
    },
    [router.query, plan, cycleParam, activeCode, activePromo?.code],
  );

  const handleSelect: NonNullable<PlanPickerProps['onSelect']> = (p, c) => {
    const nextQuery = buildQuery({ plan: p, cycle: c });
    void router.push({ pathname: '/checkout', query: nextQuery });
  };

  const handleRedeemSuccess = React.useCallback(
    ({ code }: RedeemSuccessPayload) => {
      setActiveCode(code);
      void router.replace({ pathname: '/checkout', query: buildQuery({ referral: code }) }, undefined, { shallow: true });
    },
    [buildQuery, router],
  );

  const handlePromoApply = React.useCallback(
    ({ rule }: PromoCodeApplyPayload) => {
      const normalized = normalizePromoCode(rule.code);
      setActivePromo(rule);
      void router.replace({ pathname: '/checkout', query: buildQuery({ promo: normalized }) }, undefined, { shallow: true });
    },
    [buildQuery, router],
  );

  const handlePromoClear = React.useCallback(() => {
    setActivePromo(null);
    void router.replace({ pathname: '/checkout', query: buildQuery({ promo: null }) }, undefined, { shallow: true });
  }, [buildQuery, router]);

  const monthlyCents = selectedPlanData
    ? cycleParam === 'monthly'
      ? selectedPlanData.priceMonthly
      : selectedPlanData.priceAnnual
    : 0;
  const billedAnnualTotalCents =
    selectedPlanData && cycleParam === 'annual'
      ? toUsdCents(getPlanBillingAmount(selectedPlanData.key, 'annual'))
      : 0;

  const subtotalCents = selectedPlanData
    ? cycleParam === 'annual'
      ? billedAnnualTotalCents
      : monthlyCents
    : 0;

  const promoDiscountCents = activePromo ? computePromoDiscount(activePromo, subtotalCents) : 0;
  const finalTotalCents = Math.max(subtotalCents - promoDiscountCents, 0);

  return (
    <>
      <Head>
        <title>Checkout — GramorX</title>
      </Head>

      <main className="min-h-screen bg-lightBg text-foreground antialiased dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <div className="py-16">
          <Container className="space-y-10">
            <header className="text-center max-w-3xl mx-auto mb-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-caption text-muted-foreground bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
                <i className="fas fa-sync-alt text-caption" aria-hidden="true"></i>
                Flexible plans • Cancel anytime
              </p>

              <h1 className="mt-3 text-balance text-h1">
                <span className="text-gradient-primary">{plan ? 'Complete your purchase' : 'Choose your plan'}</span>
              </h1>

              <p className="mt-2 text-body text-muted-foreground">
                {plan
                  ? 'Pay securely to unlock full IELTS modules, AI feedback, and analytics.'
                  : 'Pick a plan below — switch billing cycle and proceed to checkout.'}
              </p>
            </header>

            <div className="mx-auto mb-6">
              <SocialProofStrip />
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
              <div />
              <Link
                href="/pricing"
                className="rounded-ds border border-border px-3 py-2 text-body hover:bg-muted transition flex items-center gap-2"
              >
                <i className="fas fa-arrow-left text-caption" aria-hidden="true"></i>
                Back to pricing
              </Link>
            </div>

            {!plan ? (
              <>
                <Card className="card-surface rounded-ds-2xl p-8">
                  <PlanPicker
                    onSelect={handleSelect}
                    defaultCycle={cycleParam}
                    className="mt-0"
                    promoCode={activePromo?.code}
                  />
                </Card>

                <div className="mt-8 text-center">
                  <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 p-4 bg-muted/50 rounded-ds-xl">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-shield-alt text-accent" aria-hidden="true"></i>
                      <span className="text-caption">Secure payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-lock text-accent" aria-hidden="true"></i>
                      <span className="text-caption">SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-sync-alt text-accent" aria-hidden="true"></i>
                      <span className="text-caption">Cancel anytime</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <SocialProofStrip />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card className="card-surface rounded-ds-2xl p-8">
                      <div className="flex items-start gap-6">
                        <div className="flex-none">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-h2 bg-gradient-to-br from-primary to-electricBlue">
                            <i className={`fas ${selectedPlanData?.icon ?? 'fa-star'}`} aria-hidden="true" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h2 className="text-h3 mb-1">
                              {selectedPlanData?.title ?? PLAN_LABEL[plan]}
                            </h2>
                            {selectedPlanData?.mostPopular && (
                              <Badge variant="info" size="md" className="inline-flex">
                                {selectedPlanData.badge ?? 'MOST POPULAR'}
                              </Badge>
                            )}
                          </div>

                          <p className="text-body text-muted-foreground mb-4">
                            {selectedPlanData
                              ? `${PLAN_LABEL[plan]} — ${cycleParam === 'monthly' ? 'Monthly billing' : 'Annual billing (discounted)'}`
                              : ''}
                          </p>

                          <CheckoutForm
                            plan={plan}
                            billingCycle={cycleParam}
                            referralCode={activeCode}
                            promoCode={activePromo?.code}
                            className=""
                          />
                        </div>
                      </div>
                    </Card>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <RedeemBox onSuccess={handleRedeemSuccess} initialCode={activeCode} />
                      <PromoCodeBox
                        plan={plan}
                        cycle={cycleParam}
                        amountCents={subtotalCents}
                        onApply={handlePromoApply}
                        onClear={handlePromoClear}
                        applied={activePromo}
                        initialCode={promoParam}
                      />
                    </div>
                  </div>

                  <aside className="w-full">
                    <Card className="card-surface rounded-ds-2xl p-8 sticky top-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-h4">Order summary</h3>
                        <span className="text-caption text-muted-foreground">Review</span>
                      </div>

                      <div className="space-y-4 text-body text-muted-foreground">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-primary to-electricBlue">
                              <i className={`fas ${selectedPlanData?.icon ?? 'fa-star'}`} aria-hidden="true" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{selectedPlanData?.title ?? (plan ? PLAN_LABEL[plan] : 'Select a plan')}</div>
                              <div className="text-caption text-muted-foreground">{cycleParam === 'monthly' ? 'Billed monthly' : 'Billed annually'}</div>
                            </div>
                          </div>

                          {selectedPlanData?.mostPopular && (
                            <div>
                              <Badge variant="info" size="sm" className="inline-flex">
                                {selectedPlanData.badge ?? 'MOST POPULAR'}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <span>Price ({cycleParam === 'monthly' ? 'per month' : 'per month, billed annually'})</span>
                          <span className="font-medium text-foreground">{fmtUsd(monthlyCents)}</span>
                        </div>

                        {cycleParam === 'annual' && (
                          <>
                            <div className="flex justify-between">
                              <span>Annual total (12 months)</span>
                              <span className="font-medium text-foreground">{fmtUsd(billedAnnualTotalCents)}</span>
                            </div>
                            <div className="p-3 bg-accent/10 rounded-ds border border-accent/20">
                              <div className="flex items-center gap-2 text-accent">
                                <i className="fas fa-piggy-bank" aria-hidden="true"></i>
                                <span className="text-caption font-medium">You save {fmtUsd((selectedPlanData.priceMonthly * 12) - billedAnnualTotalCents)} compared to monthly billing</span>
                              </div>
                            </div>
                          </>
                        )}

                        {activeCode && (
                          <div className="flex justify-between items-center py-2 border-y border-border/30">
                            <span>Referral code applied</span>
                            <span className="font-mono text-caption bg-muted px-2 py-1 rounded-ds">{activeCode}</span>
                          </div>
                        )}

                        {promoDiscountCents > 0 && activePromo && (
                          <div className="flex justify-between items-center py-2 border-b border-border/30 text-success">
                            <span>Promo discount ({activePromo.code})</span>
                            <span className="font-medium">-{fmtUsd(promoDiscountCents)}</span>
                          </div>
                        )}

                        <div className="pt-3 border-t border-border/50">
                          <div className="flex justify-between text-body mb-1">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium text-foreground">{fmtUsd(subtotalCents)}</span>
                          </div>
                          <div className="flex justify-between text-body">
                            <span className="text-muted-foreground">Taxes (calculated at checkout)</span>
                            <span className="font-medium text-foreground">—</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border/50">
                          <div className="flex justify-between items-center">
                            <span className="text-body font-semibold">Total</span>
                            <span className="text-h4 text-gradient-primary">
                              {fmtUsd(finalTotalCents)}
                            </span>
                          </div>
                          <p className="mt-2 text-caption text-muted-foreground">Final price shown at checkout.</p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const nextQuery = buildQuery({ plan: null });
                            void router.push({ pathname: '/checkout', query: nextQuery });
                          }}
                          className="w-full"
                        >
                          <i className="fas fa-arrow-left text-caption mr-2" aria-hidden="true"></i>
                          Change plan
                        </Button>
                      </div>
                    </Card>
                  </aside>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: 'fa-rocket',
                      iconClass: 'text-primary',
                      title: 'Instant access',
                      copy: 'Start immediately after payment',
                    },
                    {
                      icon: 'fa-shield-alt',
                      iconClass: 'text-accent',
                      title: 'Secure payment',
                      copy: '256-bit SSL encryption',
                    },
                    {
                      icon: 'fa-sync-alt',
                      iconClass: 'text-primary',
                      title: 'Cancel anytime',
                      copy: 'No long-term commitment',
                    },
                  ].map(({ icon, iconClass, title, copy }) => (
                    <Card key={title} padding="md" insetBorder className="text-center">
                      <i className={`fas ${icon} mb-2 ${iconClass}`} aria-hidden="true"></i>
                      <h4 className="font-medium text-caption">{title}</h4>
                      <p className="text-caption text-muted-foreground">{copy}</p>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-caption text-muted-foreground">
                  <Link href="/account/referrals" className="underline-offset-4 hover:underline flex items-center gap-1">
                    <i className="fas fa-ticket-alt text-caption" aria-hidden="true"></i>
                    Don&apos;t have a code? Generate yours
                  </Link>
                  <span>•</span>
                  <Link href="/promotions" className="underline-offset-4 hover:underline flex items-center gap-1">
                    <i className="fas fa-gift text-caption" aria-hidden="true"></i>
                    View active promo codes
                  </Link>
                  <span>•</span>
                  <Link href="/partners" className="underline-offset-4 hover:underline flex items-center gap-1">
                    <i className="fas fa-handshake text-caption" aria-hidden="true"></i>
                    Become a partner
                  </Link>
                  <span>•</span>
                  <Link href="/help" className="underline-offset-4 hover:underline flex items-center gap-1">
                    <i className="fas fa-question-circle text-caption" aria-hidden="true"></i>
                    Need help?
                  </Link>
                </div>
              </>
            )}
          </Container>
        </div>
      </main>
    </>
  );
};

export default CheckoutPage;
