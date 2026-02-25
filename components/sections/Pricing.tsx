// components/sections/Pricing.tsx
import React from 'react';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';

type PlanId = 'free' | 'rocket' | 'institution';

type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  highlight?: boolean;
  badge?: string;
  priceLine: string;
  note?: string;
  href: string;
  ctaLabel: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start IELTS prep without friction.',
    priceLine: '$0 — no card required',
    note: 'Best for testing the platform and light weekly use.',
    href: '/signup',
    ctaLabel: 'Start on Free',
    features: [
      'Access to all four modules in limited mode',
      'A few AI writing / speaking checks each month',
      'Limited mock attempts with basic summaries',
      'Basic streaks and saved questions',
      'Good for “trying it out” before committing'
    ]
  },
  {
    id: 'rocket',
    name: 'Rocket',
    tagline: 'Serious prep for 6.0 → 7.0+ journeys.',
    highlight: true,
    badge: 'Most popular (planned)',
    priceLine: 'Intro pricing will launch with the next cohort',
    note: 'For learners who want consistent AI feedback and deeper analytics.',
    href: '#waitlist',
    ctaLabel: 'Join Rocket waitlist',
    features: [
      'Everything in Free, plus higher AI usage limits',
      'Deeper band-style feedback for Writing & Speaking',
      'More full mock attempts per month',
      'Access to AI Lab and “Before / After” comparisons',
      'Progress dashboards with skill-wise weak areas',
      'Priority access to new features and experiments'
    ]
  },
  {
    id: 'institution',
    name: 'Teachers & Institutions',
    tagline: 'For academies and coaching centers.',
    badge: 'Coming soon',
    priceLine: 'Custom pricing',
    note: 'Built for teachers who manage multiple learners or cohorts.',
    href: '#waitlist',
    ctaLabel: 'Talk to us via waitlist',
    features: [
      'Teacher / admin dashboards (planned)',
      'Cohort and batch-level analytics',
      'Shared content and assignment flows',
      'Co-branded experiences for your academy',
      'Early access to institutional features',
      'We’ll contact you when this track is ready'
    ]
  }
];

const Pricing: React.FC = () => {
  return (
    <Section
      id="pricing"
      tone="default"
      divider="top"
      Container
      containerClassName="py-24"
    >
      {/* Header */}
      <div className="mb-10 max-w-3xl text-center mx-auto">
        <p
          id="pricing-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
        >
          Pricing & plans
        </p>
        <h2 className="mt-2 font-slab text-2xl md:text-3xl text-foreground">
          Start free. Upgrade to Rocket when you&apos;re serious.
        </h2>
        <p className="mt-3 text-xs md:text-sm text-muted-foreground">
          Free gives you enough to get a feel for the platform. Rocket is where we unlock
          higher AI limits, more mocks, and deeper analytics. Institutional plans are for
          teachers and academies who need cohort-level visibility.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            interactive
            className={`relative h-full rounded-ds-2xl border border-border/70 bg-surface/95 p-6 ${
              plan.highlight ? 'ring-2 ring-accent shadow-xl' : ''
            }`}
          >
            {plan.badge ? (
              <div className="absolute -top-3 right-4">
                <Badge variant={plan.highlight ? 'accent' : 'neutral'} size="xs">
                  {plan.badge}
                </Badge>
              </div>
            ) : null}

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.tagline}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{plan.priceLine}</p>
                {plan.note ? (
                  <p className="text-[11px] text-muted-foreground">{plan.note}</p>
                ) : null}
              </div>

              <ul className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-[2px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                      <Icon name="Check" size={10} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <Button
                as="a"
                href={plan.href}
                variant={plan.id === 'rocket' ? 'primary' : 'secondary'}
                size="sm"
                className="w-full rounded-ds-xl"
              >
                {plan.ctaLabel}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Footnote */}
      <div className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <Icon name="Info" size={14} />
          <span>
            We&apos;re finalizing exact Rocket pricing with early cohorts. Joining the
            waitlist means we&apos;ll email you before anything gets charged.
          </span>
        </div>
        <div className="inline-flex items-center gap-2">
          <Icon name="ShieldCheck" size={14} />
          <span>No surprise billing — upgrade flows will be explicit and transparent.</span>
        </div>
      </div>
    </Section>
  );
};

export default Pricing;
