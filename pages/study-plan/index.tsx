// pages/pricing/index.tsx
import * as React from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { CheckIcon } from '@/components/design-system/icons';

import { usePlan } from '@/hooks/usePlan';
import { getPlanPricing, getStandardPlanName } from '@/lib/subscription';
import {
  USD_PLAN_PRICES,
  PLAN_LABEL,
  type PlanKey,
} from '@/lib/pricing';
import type { Reason } from '@/lib/paywall/redirect';

// Helper to normalize query parameters
function normalizePricingParams(query: ReturnType<typeof useRouter>['query']) {
  const params: {
    reason?: string;
    plan?: PlanKey;
    returnTo?: string;
    ref?: string;
    code?: string;
  } = {};

  // Reason
  if (typeof query.reason === 'string') params.reason = query.reason;
  else if (typeof query.need === 'string') params.reason = 'plan_required';
  else if (typeof query.required === 'string') params.reason = 'plan_required';

  // Plan
  if (typeof query.plan === 'string') params.plan = query.plan as PlanKey;
  else if (typeof query.need === 'string') params.plan = query.need as PlanKey;
  else if (typeof query.required === 'string') params.plan = query.required as PlanKey;

  // ReturnTo
  if (typeof query.returnTo === 'string') params.returnTo = query.returnTo;
  else if (typeof query.from === 'string') params.returnTo = query.from;

  // Ref
  if (typeof query.ref === 'string') params.ref = query.ref;

  // Code
  if (typeof query.code === 'string') params.code = query.code;

  return params;
}

// ------------------ Page ------------------
const PricingPage: NextPage = () => {
  const router = useRouter();
  const { plan: currentPlan } = usePlan();

  // Normalize incoming parameters
  const normalizedParams = React.useMemo(() => normalizePricingParams(router.query), [router.query]);
  const { reason, plan: suggestedPlan, returnTo, ref, code } = normalizedParams;

  // You can now use these normalized values to highlight a plan, show a message, etc.
  // For example, pre‑select a plan tab or show a banner based on reason.

  // Example: highlight a plan if suggestedPlan is present
  const highlightedPlan = suggestedPlan && ['free', 'starter', 'booster', 'master'].includes(suggestedPlan)
    ? suggestedPlan
    : null;

  // Show a banner if there's a reason
  const showReasonBanner = reason === 'plan_required' || reason === 'quota_exceeded';

  return (
    <>
      <Head>
        <title>Pricing — GramorX</title>
        <meta
          name="description"
          content="Premium global pricing for GramorX IELTS — multi-currency, timezone-aware, and conversion-optimized."
        />
      </Head>

      <main role="main" className="min-h-screen bg-marketing-aurora text-foreground antialiased">
        {showReasonBanner && (
          <div className="bg-primary/10 border-b border-primary/20 py-3 text-center text-sm">
            {reason === 'plan_required' && (
              <p>
                You need a higher plan to access that feature.{' '}
                {suggestedPlan && `We recommend the ${getStandardPlanName(suggestedPlan)} plan.`}
              </p>
            )}
            {reason === 'quota_exceeded' && (
              <p>You’ve reached your daily limit. Upgrade for unlimited access.</p>
            )}
          </div>
        )}

        <Section id="pricing">
          <Container className="pt-6 md:pt-8 pb-12 md:pb-16" aria-labelledby="pricing-title">
            {/* Breadcrumb / back link if returnTo is present */}
            {returnTo && (
              <div className="mb-4">
                <Link href={returnTo} className="text-sm text-muted-foreground hover:text-foreground">
                  ← Back
                </Link>
              </div>
            )}

            <div className="text-center">
              <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
                Simple, fair pricing
              </Badge>
              <h1 id="pricing-title" className="mt-3 md:mt-3 text-balance text-display md:text-displayLg font-semibold leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500">
                  Choose your plan
                </span>
              </h1>
              <p className="mt-3 text-body text-muted-foreground max-w-2xl mx-auto">
                Start free, upgrade when you need more. All plans include core IELTS practice.
              </p>
            </div>

            <section id="plans" aria-labelledby="plans-heading" className="mt-6 md:mt-8">
              <h2 id="plans-heading" className="sr-only">Plans and pricing options</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Free Plan */}
                <Card className="relative p-6" elevated={highlightedPlan === 'free'}>
                  {highlightedPlan === 'free' && (
                    <Badge variant="success" className="absolute -top-2 left-4">Recommended</Badge>
                  )}
                  <h3 className="text-xl font-semibold">{getStandardPlanName('free')}</h3>
                  <p className="mt-2 text-3xl font-bold">${getPlanPricing('free').monthly}</p>
                  <p className="text-sm text-muted-foreground">forever free</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> 5 mock attempts / month</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Basic AI feedback</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Community access</li>
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={currentPlan === 'free' ? 'secondary' : 'primary'}>
                    <Link href={currentPlan === 'free' ? '/dashboard' : '/signup'}>
                      {currentPlan === 'free' ? 'Your current plan' : 'Get started'}
                    </Link>
                  </Button>
                </Card>

                {/* Starter Plan */}
                <Card className="relative p-6" elevated={highlightedPlan === 'starter'}>
                  {highlightedPlan === 'starter' && (
                    <Badge variant="success" className="absolute -top-2 left-4">Recommended</Badge>
                  )}
                  <h3 className="text-xl font-semibold">{getStandardPlanName('starter')}</h3>
                  <p className="mt-2 text-3xl font-bold">${getPlanPricing('starter').monthly}</p>
                  <p className="text-sm text-muted-foreground">per month, billed monthly</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Unlimited mock attempts</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Advanced AI feedback</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Priority support</li>
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={currentPlan === 'starter' ? 'secondary' : 'primary'}>
                    <Link href={currentPlan === 'starter' ? '/dashboard' : '/checkout?plan=starter'}>
                      {currentPlan === 'starter' ? 'Current plan' : 'Upgrade'}
                    </Link>
                  </Button>
                </Card>

                {/* Booster Plan */}
                <Card className="relative p-6" elevated={highlightedPlan === 'booster'}>
                  {highlightedPlan === 'booster' && (
                    <Badge variant="success" className="absolute -top-2 left-4">Recommended</Badge>
                  )}
                  <h3 className="text-xl font-semibold">{getStandardPlanName('booster')}</h3>
                  <p className="mt-2 text-3xl font-bold">${getPlanPricing('booster').monthly}</p>
                  <p className="text-sm text-muted-foreground">per month, billed monthly</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Everything in Starter</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> AI‑powered study plan</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> 1‑on‑1 coaching session</li>
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={currentPlan === 'booster' ? 'secondary' : 'primary'}>
                    <Link href={currentPlan === 'booster' ? '/dashboard' : '/checkout?plan=booster'}>
                      {currentPlan === 'booster' ? 'Current plan' : 'Upgrade'}
                    </Link>
                  </Button>
                </Card>

                {/* Master Plan */}
                <Card className="relative p-6" elevated={highlightedPlan === 'master'}>
                  {highlightedPlan === 'master' && (
                    <Badge variant="success" className="absolute -top-2 left-4">Recommended</Badge>
                  )}
                  <h3 className="text-xl font-semibold">{getStandardPlanName('master')}</h3>
                  <p className="mt-2 text-3xl font-bold">${getPlanPricing('master').monthly}</p>
                  <p className="text-sm text-muted-foreground">per month, billed monthly</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Everything in Booster</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Unlimited coaching</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-600" /> Priority feature access</li>
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={currentPlan === 'master' ? 'secondary' : 'primary'}>
                    <Link href={currentPlan === 'master' ? '/dashboard' : '/checkout?plan=master'}>
                      {currentPlan === 'master' ? 'Current plan' : 'Upgrade'}
                    </Link>
                  </Button>
                </Card>
              </div>
            </section>

            {/* Referral code handling */}
            {code && (
              <div className="mt-8 text-center text-sm text-muted-foreground">
                Referral code applied: <span className="font-mono">{code}</span>
              </div>
            )}
          </Container>
        </Section>
      </main>
    </>
  );
};

export default PricingPage;