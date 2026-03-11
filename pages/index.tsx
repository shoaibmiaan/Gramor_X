// pages/index.tsx – Mobile‑optimised home page
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';
import { getPlanPricing, getStandardPlanName } from '@/lib/subscription';
import { getHomeOverviewPayload } from '@/lib/home/overview';
import type { HomeOverviewPayload } from '@/types/home';

export const LANDING_PLANS = [
  {
    id: 'free',
    name: getStandardPlanName('free'),
    price: `$${getPlanPricing('free').monthly}`,
    tag: 'Start here',
    bullets: [
      'Access to all four modules in limited mode',
      'A few AI checks per month',
      'Basic streaks & saved items',
    ],
  },
  {
    id: 'booster',
    name: getStandardPlanName('booster'),
    price: `$${getPlanPricing('booster').monthly}/mo`,
    tag: 'Most popular',
    bullets: [
      'Deeper AI writing + speaking feedback',
      'More mocks per month',
      'Full analytics and AI Lab features',
    ],
    highlight: true,
  },
  {
    id: 'institution',
    name: 'Institution / Teacher',
    price: 'Talk to us',
    tag: 'For schools',
    bullets: ['Teacher dashboards', 'Cohort analytics', 'Co-branded experiences'],
  },
];

type LandingPageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const LandingPage: React.FC<LandingPageProps> = ({ homeOverview }) => {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const hasPayload = Boolean(homeOverview);
  const modules = homeOverview?.modules ?? [];
  const quickLinks = homeOverview?.quickLinks ?? [];
  const releaseHighlights = homeOverview?.releaseHighlights ?? [];
  const testimonials = homeOverview?.testimonials ?? [];

  const getBadgeVariant = (tone: 'success' | 'accent' | 'info' | 'neutral' | 'warning') =>
    tone === 'success'
      ? 'success'
      : tone === 'accent'
      ? 'accent'
      : tone === 'warning'
      ? 'warning'
      : tone === 'info'
      ? 'info'
      : 'neutral';

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Head>
        <title>GramorX AI — IELTS Mission Control</title>
        <meta
          name="description"
          content="IELTS prep that actually respects your time. Four modules, AI-first feedback, and a dashboard that tells you what to do next."
        />
      </Head>

      <main className="bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        {/* HERO – more compact on mobile */}
        <section className="pb-10 pt-10 md:pb-16 md:pt-20">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
              {/* Left side: text + CTAs */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-ds-full bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/60">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="Sparkles" size={14} />
                  </span>
                  <span>Refreshed platform • IELTS prep + AI + institutions</span>
                </div>

                <div className="space-y-4">
                  <h1 className="font-slab text-display text-gradient-primary">
                    Your complete IELTS operating system.
                  </h1>
                  <p className="max-w-xl text-body text-grayish">
                    From AI coaching and study buddy sessions to full mocks, analytics, and
                    institutional tools — everything now lives in one connected platform.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-small text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="Target" size={14} /> Built for daily prep + full exam readiness
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="Globe2" size={14} /> Individual learners, teachers, and institutions
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Button asChild variant="primary" size="lg" className="rounded-ds-2xl px-6">
                    <Link href="/signup">Start free practice</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg" className="rounded-ds-2xl px-6">
                    <Link
                      href={
                        isAuthed
                          ? dashboardHref
                          : `/login?next=${encodeURIComponent(dashboardHref)}`
                      }
                    >
                      View my dashboard
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="ShieldCheck" size={14} /> No-card free tier
                  </span>
                  <span>•</span>
                  <span>AI usage is capped on Free and unlocked on Booster</span>
                </div>
              </div>

              {/* Right side: Word of the Day – smaller on mobile */}
              <div className="mx-auto w-full max-w-sm space-y-4 md:max-w-none">
                <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-4 shadow-sm md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs">
                        Vocabulary spotlight
                      </p>
                      <h2 className="font-slab text-base md:text-h3">Word of the day</h2>
                    </div>
                    <Badge variant="accent" size="xs" className="whitespace-nowrap">
                      Lexical Resource
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-lg font-semibold text-foreground md:text-2xl">
                          serendipity
                        </p>
                        <span className="text-[10px] text-muted-foreground md:text-xs">
                          /ˌser.ənˈdɪp.ə.ti/
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-grayish md:text-small">
                        the occurrence of events by chance in a happy or beneficial way
                      </p>
                    </div>

                    <p className="border-l-2 border-primary/40 pl-2 text-xs text-primary/90 dark:text-electricBlue md:text-small">
                      “Finding a platform that understood my exact band goal felt like pure
                      serendipity.”
                    </p>

                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground md:text-xs">
                      <Badge variant="neutral" size="xs">
                        Band 7+ vocab
                      </Badge>
                      <span>•</span>
                      <span>Useful in Speaking Part 1 & Writing Task 2</span>
                    </div>

                    <div className="pt-1">
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="w-full rounded-ds-xl md:w-auto"
                      >
                        <Link href="/vocabulary">Take 60-second vocab quiz</Link>
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Countdown card – hidden on mobile, appears only on desktop */}
                <Card className="hidden rounded-ds-2xl border border-border/60 bg-card/80 p-5 md:block">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Next launch window
                      </p>
                      <p className="text-small text-grayish">
                        We onboard small cohorts so support never feels like a ticketing system.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-slab text-h3 leading-none">7 days</p>
                      <p className="text-xs text-muted-foreground">until next public batch</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                    <div className="rounded-ds-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">07</div>
                      <div>Days</div>
                    </div>
                    <div className="rounded-ds-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">16</div>
                      <div>Hours</div>
                    </div>
                    <div className="rounded-ds-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">45</div>
                      <div>Min</div>
                    </div>
                    <div className="rounded-ds-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">30</div>
                      <div>Sec</div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Join the waitlist now and we’ll reserve early-bird pricing for you when the
                    batch opens.
                  </p>
                </Card>
              </div>
            </div>
          </Container>
        </section>

        {/* QUICK LINKS / PORTAL HUB – horizontal scroll on mobile */}
        <section className="pb-12">
          <Container>
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-slab text-xl md:text-h2">Portal hub</h2>
                <p className="text-xs text-grayish md:text-small">
                  From this page, you can jump to any core area — dashboard, modules, AI Lab,
                  billing, or onboarding.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral" size="sm">
                  All navigation lives here
                </Badge>
              </div>
            </div>

            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-3">
              {!hasPayload && (
                <Card className="min-w-[240px] shrink-0 rounded-ds-2xl border border-border/60 bg-card/70 p-4 text-xs text-muted-foreground">
                  Home overview is temporarily unavailable. Core navigation is still accessible from the main menu.
                </Card>
              )}
              {quickLinks.map((item) => (
                <Card
                  key={item.href}
                  className="group flex min-w-[240px] shrink-0 cursor-pointer flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/70 p-4 transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg md:min-w-0"
                >
                  <Link href={item.href} className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:h-9 md:w-9">
                        <Icon name={item.icon} size={16} />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground md:text-sm">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground md:text-xs">
                          {item.description}
                        </p>
                        <p className="text-[10px] text-primary/80 md:text-xs">{item.availability.label}</p>
                      </div>
                    </div>
                    <span className="mt-1 inline-flex items-center text-[10px] font-medium text-primary group-hover:underline md:text-xs">
                      {item.actionLabel}
                      <Icon name="ArrowRight" size={12} className="ml-1" />
                    </span>
                  </Link>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-12 md:py-14">
          <Container>
            <div className="mb-6 md:mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs">
                What&apos;s new in GramorX
              </p>
              <h2 className="mt-2 font-slab text-xl md:text-h2">
                Recent upgrades across the platform
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {!hasPayload && (
                <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-5 text-xs text-muted-foreground md:col-span-3">
                  Release highlights are loading. Check back shortly for the latest updates.
                </Card>
              )}
              {releaseHighlights.map((item) => (
                <Card
                  key={item.title}
                  className="rounded-ds-2xl border border-border/60 bg-card/70 p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground md:text-base">{item.title}</h3>
                    <Badge size="xs" variant="neutral">{item.statusLabel}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground md:text-sm">{item.description}</p>
                  <Button asChild size="sm" variant="secondary" className="mt-4 rounded-ds-xl">
                    <Link href={item.href}>{item.ctaLabel}</Link>
                  </Button>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* MODULES OVERVIEW */}
        <section className="bg-muted/40 py-12 md:py-16">
          <Container>
            <div className="mb-8 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs">
                Four modules + AI, one workspace
              </p>
              <h2 className="mt-2 font-slab text-xl md:text-h2">
                Everything you need to go from “stuck” to exam‑ready.
              </h2>
              <p className="mt-2 text-xs text-grayish md:text-small md:max-w-2xl md:mx-auto">
                Not just practice questions. A full stack: onboarding, learning, practice, mocks, AI
                feedback, analytics, and gamification — all aware of your goal band and exam date.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {!hasPayload && (
                <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-5 text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
                  Module data is unavailable right now. Please refresh to load the latest module statuses.
                </Card>
              )}
              {modules.map((mod) => (
                <Card
                  key={mod.id}
                  className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:bg-card/90 hover:shadow-lg md:p-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary md:h-11 md:w-11">
                          <Icon name={mod.icon} size={18} />
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-foreground md:text-lg">
                            {mod.title}
                          </h3>
                          <Badge size="xs" variant="accent">
                            {mod.progress}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground md:text-small">
                          Last activity:{' '}
                          {mod.lastActivityAt
                            ? new Date(mod.lastActivityAt).toLocaleDateString()
                            : 'No attempts yet'}
                        </p>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(0, Math.min(100, mod.progress))}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          size="xs"
                          variant={getBadgeVariant(mod.status.tone)}
                        >
                          {mod.status.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{mod.availability.label}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {mod.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="mt-[3px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                            <Icon name="Check" size={10} />
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {mod.reason ? (
                    <p className="pt-3 text-xs text-muted-foreground">{mod.reason}</p>
                  ) : null}

                  <div className="pt-4">
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="w-full rounded-ds-xl"
                    >
                      <Link href={mod.ctaHref}>{mod.isEnabled ? `Open ${mod.title}` : `Unlock ${mod.title}`}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* TESTIMONIALS – compact on mobile */}
        <section className="py-12">
          <Container>
            <div className="mb-6 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs">
                Real prep, real constraints
              </p>
              <h2 className="mt-1 font-slab text-xl md:text-h2">
                Built for people with limited time.
              </h2>
              <p className="mt-2 text-xs text-grayish md:text-small md:max-w-2xl md:mx-auto">
                Evening learners, working professionals, undergrads — we optimize around your
                bandwidth, not around 6‑hour study fantasies.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {!hasPayload && (
                <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-4 text-xs text-muted-foreground md:col-span-3">
                  Testimonials are currently unavailable.
                </Card>
              )}
              {testimonials.map((t) => (
                <Card
                  key={t.name}
                  className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/70 p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary md:h-11 md:w-11 md:text-sm">
                        {t.initials}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground md:text-sm">{t.name}</p>
                        <p className="text-[10px] text-primary/80 md:text-xs">{t.meta}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground md:text-sm">“{t.quote}”</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-success md:mt-4 md:gap-2 md:text-xs">
                    <Icon name="Medal" size={12} />
                    <span>{t.resultLabel}</span>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* PRICING PREVIEW – ensure buttons full width on mobile */}
        <section className="bg-muted/40 py-12">
          <Container>
            <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs">
                  Pricing preview
                </p>
                <h2 className="mt-1 font-slab text-xl md:text-h2">
                  Start free. Upgrade when you’re serious.
                </h2>
                <p className="mt-1 text-xs text-grayish md:text-small md:max-w-xl">
                  Free covers basic practice and a taste of AI. Booster unlocks deeper feedback and
                  more mocks. Institutional is for teachers and academies.
                </p>
              </div>
              <Button asChild size="sm" variant="ghost" className="rounded-ds-xl mt-2 md:mt-0">
                <Link href="/pricing">View full pricing page</Link>
              </Button>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {LANDING_PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={`flex h-full flex-col justify-between rounded-ds-2xl border border-border/70 bg-card/80 p-5 md:p-6 ${
                    plan.highlight ? 'ring-2 ring-accent shadow-lg' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground md:text-lg">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{plan.price}</p>
                      </div>
                      <Badge size="xs" variant={plan.highlight ? 'accent' : 'neutral'}>
                        {plan.tag}
                      </Badge>
                    </div>
                    <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                      {plan.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="mt-[3px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                            <Icon name="Check" size={10} />
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button
                      asChild
                      size="sm"
                      variant={plan.id === 'booster' ? 'primary' : 'secondary'}
                      className="w-full rounded-ds-xl"
                    >
                      <Link href="/pricing">
                        {plan.id === 'free' ? 'Stay on Free' : 'See plan details'}
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* WAITLIST / FINAL CTA – unchanged */}
        <section className="py-12">
          <Container>
            <Card className="mx-auto max-w-4xl rounded-ds-2xl border border-border/60 bg-card/80 p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary md:text-xs">
                    Pre-launch batch
                  </p>
                  <h2 className="font-slab text-xl md:text-h2">
                    Join the early cohort and lock in better pricing.
                  </h2>
                  <p className="text-xs text-grayish md:text-small">
                    We’re onboarding in waves so we don’t drown support. Add your email and target
                    band, and we’ll send a proper orientation when your batch opens — no spam, no
                    fake urgency.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>• First wave gets discounted Booster pricing.</li>
                    <li>• Teachers / academies can request a separate call.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-1">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        type="email"
                        className="h-10 w-full rounded-ds-xl border border-border bg-input px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Target IELTS band
                      </label>
                      <input
                        type="text"
                        className="h-10 w-full rounded-ds-xl border border-border bg-input px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. 7.0, 7.5, 8.0"
                      />
                    </div>
                    <Button type="button" variant="accent" className="mt-1 w-full rounded-ds-xl">
                      Join waitlist
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      No spam. We’ll only email when your batch is actually opening.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Container>
        </section>

        {/* STICKY BOTTOM CTA (mobile only) */}
        {showStickyCta && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 p-3 backdrop-blur-md md:hidden">
            <Button asChild variant="primary" size="lg" className="w-full rounded-ds-2xl">
              <Link href="/signup">Start free practice</Link>
            </Button>
          </div>
        )}
      </main>

      {/* Hide scrollbar for horizontal scroll on mobile */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<{ homeOverview: HomeOverviewPayload | null }> = async () => {
  try {
    return {
      props: {
        homeOverview: getHomeOverviewPayload(),
      },
    };
  } catch (error) {
    console.error('Failed to load home overview payload', error);
    return {
      props: {
        homeOverview: null,
      },
    };
  }
};

export default LandingPage;
