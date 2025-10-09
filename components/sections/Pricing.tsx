import React from 'react';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Ribbon } from '@/components/design-system/Ribbon';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

type BillingCycle = 'monthly' | 'quarterly';

type Tier = {
  name: 'Compass' | 'Seedling' | 'Rocket';
  headline: string;
  description: string;
  price: Record<BillingCycle, string>;
  savings?: string;
  featured: boolean;
  features: string[];
  guarantee: string;
};

const tiers: readonly Tier[] = [
  {
    name: 'Compass',
    headline: 'Kickstart your prep',
    description: 'Core modules plus daily streak nudges to build momentum.',
    price: { monthly: 'Free', quarterly: 'Free' },
    featured: false,
    features: [
      'IELTS basics across all four skills',
      'Daily vocab streak challenge',
      'Weekly grammar micro-drill',
      'Two AI essay checks per month',
    ],
    guarantee: 'Preview the adaptive system before upgrading.',
  },
  {
    name: 'Seedling',
    headline: 'Guided growth',
    description: 'Adaptive plans, twice-monthly mocks, and AI feedback for steady gains.',
    price: { monthly: '$9.99', quarterly: '$25.50' },
    savings: 'Save 15% billed quarterly',
    featured: false,
    features: [
      'Adaptive daily lessons with diagnostics',
      'Two full mock tests each month',
      'Five AI writing reviews per month',
      'Three speaking partner sessions with transcripts',
      'Skill analytics dashboard',
      'Email + community support',
    ],
    guarantee: 'Switch or cancel anytime—no lock-in.',
  },
  {
    name: 'Rocket',
    headline: 'Exam sprint',
    description: 'Unlimited mocks, deeper analytics, and human coaching when it counts.',
    price: { monthly: '$14.99', quarterly: '$38.25' },
    savings: 'Includes priority teacher reviews',
    featured: true,
    features: [
      'Unlimited full-length mock exams',
      'Unlimited AI writing + speaking transcripts',
      'Weekly teacher review on writing & speaking',
      'Advanced performance intelligence sprints',
      'Premium rooms and live workshops',
      'Band predictor with personalised reports',
    ],
    guarantee: 'Score-improvement guarantee or next month free.',
  },
];

const valueProps = [
  {
    icon: 'ShieldCheck',
    title: '14-day satisfaction',
    description: 'Not a fit within 14 days? We refund the latest charge.',
  },
  {
    icon: 'Sparkles',
    title: 'All plans include',
    description: 'AI feedback, speaking transcripts, and an exam-day style UI.',
  },
  {
    icon: 'Headphones',
    title: 'Human help when stuck',
    description: 'Mentors reply with rubric notes within 24 hours on paid tiers.',
  },
] as const;

const billingCopy: Record<BillingCycle, { label: string; helper: string }> = {
  monthly: { label: 'Monthly', helper: 'Pause anytime' },
  quarterly: { label: 'Quarterly', helper: 'Save 15%' },
};

const planSlug = (name: Tier['name']) => name.toLowerCase();

export const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>('monthly');

  return (
    <Section id="pricing">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="Layers" className="text-electricBlue" size={16} />
            Flexible access for every mission
          </Badge>
          <h2 className="font-slab text-display tracking-tight text-gradient-primary">Choose your launch velocity</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free, upgrade when you need unlimited mocks and coaching.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {(Object.keys(billingCopy) as BillingCycle[]).map((cycle) => {
            const active = billingCycle === cycle;
            return (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={
                  'group relative overflow-hidden rounded-full border px-5 py-2 text-sm font-semibold transition ' +
                  (active
                    ? 'border-electricBlue/60 bg-electricBlue/15 text-electricBlue shadow-sm shadow-electricBlue/20'
                    : 'border-border/60 bg-background/70 text-muted-foreground hover:border-electricBlue/30 hover:text-electricBlue')
                }
                aria-pressed={active}
              >
                <span>{billingCopy[cycle].label}</span>
                <span className="ml-2 text-xs font-medium text-muted-foreground/80 group-hover:text-electricBlue/80">
                  {billingCopy[cycle].helper}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => {
            const price = tier.price[billingCycle];
            return (
              <Card
                key={tier.name}
                className={`relative h-full overflow-hidden border ${
                  tier.featured
                    ? 'border-electricBlue/50 bg-gradient-to-br from-electricBlue/12 via-background to-purpleVibe/10 shadow-xl shadow-electricBlue/10'
                    : 'border-border/60 bg-background/80 shadow-sm'
                }`}
                padding="xl"
                interactive
              >
                {tier.featured ? <Ribbon label="Most popular" variant="accent" position="top-right" /> : null}

                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-semibold text-foreground">{tier.name}</h3>
                  <Badge variant={tier.featured ? 'accent' : 'secondary'} size="sm">
                    {tier.featured ? 'Full access' : 'Core access'}
                  </Badge>
                </div>

                <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground/80">{tier.headline}</p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{tier.description}</p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="font-slab text-4xl font-semibold text-gradient-primary">{price}</span>
                  <span className="text-sm text-muted-foreground">{billingCycle === 'monthly' ? 'per month' : 'per 3 months'}</span>
                </div>
                {tier.savings ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-electricBlue/30 bg-electricBlue/10 px-3 py-1 text-xs font-semibold text-electricBlue">
                    <Icon name="Sparkles" size={14} aria-hidden="true" /> {tier.savings}
                  </div>
                ) : null}

                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neonGreen/15 text-neonGreen">
                        <Icon name="Check" size={16} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-2xl border border-dashed border-electricBlue/40 bg-electricBlue/5 px-4 py-3 text-sm text-electricBlue/90">
                  <Icon name="ShieldCheck" size={16} className="mr-2 inline-block align-middle" />
                  {tier.guarantee}
                </div>

                <div className="mt-6 grid gap-3">
                  <Button
                    href={`/checkout?plan=${planSlug(tier.name)}&cycle=${billingCycle}`}
                    variant={tier.featured ? 'primary' : 'secondary'}
                    className="w-full justify-center"
                  >
                    Choose {tier.name}
                  </Button>
                  <Link
                    href="/waitlist"
                    className="text-center text-sm font-semibold text-electricBlue transition hover:text-electricBlue/80"
                  >
                    Not ready? Join the pre-launch list
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {valueProps.map((value) => (
            <Card key={value.title} className="h-full border border-border/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:bg-dark/70">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-electricBlue/10 text-electricBlue">
                <Icon name={value.icon} size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{value.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
};

export default Pricing;
