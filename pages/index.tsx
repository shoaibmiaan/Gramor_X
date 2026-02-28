// pages/index.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import Layout from '@/layouts/Layout';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Input } from '@/components/design-system/Input';
import Icon, { type IconName } from '@/components/design-system/Icon';

// ────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────

const modules = [
  {
    id: 'learning',
    icon: 'BookOpenCheck' as IconName,
    title: 'Learning Hub',
    status: 'Live',
    statusTone: 'success' as const,
    description: 'Concept lessons, strategy guides, and grammar refreshers wired to your target band.',
    bullets: [
      'Academic & General Training coverage',
      'Micro-lessons for all four skills',
      'AI-personalised paths by band goal',
    ],
    href: '/learning',
  },
  {
    id: 'practice',
    icon: 'Edit3' as IconName,
    title: 'Practice & Drills',
    status: 'Live',
    statusTone: 'accent' as const,
    description: 'Short, exam-style tasks that you can finish in 10–20 minutes.',
    bullets: [
      'Writing, Reading, Listening, Speaking',
      'Timer-aware practice flows',
      'Bookmarks + saved questions',
    ],
    href: '/practice',
  },
  {
    id: 'mock',
    icon: 'Timer' as IconName,
    title: 'Full Mock Tests',
    status: 'Rolling out',
    statusTone: 'info' as const,
    description: 'Serious exam rehearsals with band estimates and post-test breakdowns.',
    bullets: [
      'Full-length timed mocks',
      'Section-wise band estimates',
      'Cheating-safe Exam workspace',
    ],
    href: '/mock',
  },
  {
    id: 'ai-lab',
    icon: 'Sparkles' as IconName,
    title: 'AI Lab',
    status: 'Core',
    statusTone: 'accent' as const,
    description: 'Where AI Coach, Study Buddy, and Mistakes Book live together.',
    bullets: [
      'Task 1 & 2 band feedback',
      'Speaking insights from audio',
      'Compare “Before vs After” edits',
    ],
    href: '/ai',
  },
  {
    id: 'analytics',
    icon: 'PieChart' as IconName,
    title: 'Progress & Analytics',
    status: 'Beta',
    statusTone: 'info' as const,
    description: 'Band trajectory, weak areas, and time usage in one place.',
    bullets: [
      'Skill-wise band curve',
      'Accuracy by question type',
      'Study time + streak tracking',
    ],
    href: '/progress',
  },
  {
    id: 'gamification',
    icon: 'Trophy' as IconName,
    title: 'Gamification & Streaks',
    status: 'Live',
    statusTone: 'success' as const,
    description: 'Daily streaks, weekly challenges, and quiet competition.',
    bullets: [
      'Daily streak shields',
      'Weekly IELTS challenges',
      'Badges for consistency',
    ],
    href: '/dashboard',
  },
];

const quickLinks = [
  {
    label: 'Go to dashboard',
    description: 'Continue where you left off.',
    href: '/dashboard',
    icon: 'LayoutDashboard' as IconName,
  },
  {
    label: 'Finish onboarding',
    description: 'Lock in goal band, exam date, and plan.',
    href: '/profile/setup',
    icon: 'ClipboardCheck' as IconName,
  },
  {
    label: 'Start free writing check',
    description: 'Run a Task 2 through AI Coach.',
    href: '/writing',
    icon: 'PenSquare' as IconName,
  },
  {
    label: 'Take a reading drill',
    description: 'Practice under light time pressure.',
    href: '/reading',
    icon: 'FileText' as IconName,
  },
  {
    label: 'Explore Vocabulary Lab',
    description: 'Topic-wise vocab packs for IELTS.',
    href: '/vocabulary',
    icon: 'BookMarked' as IconName,
  },
  {
    label: 'Check pricing & plans',
    description: 'Free vs Rocket vs higher tiers.',
    href: '/pricing',
    icon: 'CreditCard' as IconName,
  },
];

const testimonials = [
  {
    initials: 'AS',
    name: 'Ayesha S.',
    meta: 'From 6.0 to 7.5 in 7 weeks',
    quote:
      'The AI writing feedback plus streak system basically forced me to stay consistent. It felt like a serious coach, not a random app.',
    band: 'Overall 7.5',
  },
  {
    initials: 'HM',
    name: 'Hassan M.',
    meta: 'Busy professional, evening prep',
    quote:
      'The daily tasks were small enough for my schedule, but the analytics still showed real progress. Speaking AI saved me from booking endless mock interviews.',
    band: 'Writing 7.0 → 7.5',
  },
  {
    initials: 'LC',
    name: 'Li C.',
    meta: 'First attempt, overseas study',
    quote:
      'GramorX feels like “mission control” for IELTS. I always knew what to do next instead of scrolling random YouTube videos.',
    band: 'Overall 7.0',
  },
];

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    tag: 'Start here',
    bullets: [
      'Access to all four modules in limited mode',
      'A few AI checks per month',
      'Basic streaks & saved items',
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    price: 'Best for 6.5 → 7.5+',
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
    bullets: [
      'Teacher dashboards',
      'Cohort analytics',
      'Co-branded experiences',
    ],
  },
];

export default function LandingPage() {
  return (
    <Layout>
      <Head>
        <title>GramorX AI — IELTS Mission Control</title>
        <meta
          name="description"
          content="IELTS prep that actually respects your time. Four modules, AI-first feedback, and a dashboard that tells you what to do next."
        />
      </Head>

      <main className="bg-surface dark:bg-darker">
        {/* HERO */}
        <section className="py-16">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-medium text-muted ring-1 ring-border/60">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="Sparkles" size={16} />
                  </span>
                  <span>Private beta • IELTS four modules + AI Lab</span>
                </div>

                <div className="space-y-4">
                  <h1 className="font-slab text-display text-primary">
                    IELTS Mission Control, not just another question bank.
                  </h1>
                  <p className="max-w-xl text-body text-muted">
                    Listening, Reading, Writing, Speaking — stitched together with AI-first feedback, a streak system that actually matters, and a dashboard that tells you what to do next.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-small text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="Target" size={20} /> Built for band 6.0–8.0 journeys
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="Globe2" size={20} /> Global-ready, focused on Pakistan + US learners first
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button asChild variant="primary" size="lg" className="rounded-2xl px-6">
                    <Link href="/signup">Start free practice</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg" className="rounded-2xl px-6">
                    <Link href="/login?next=/dashboard">View my dashboard</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="ShieldCheck" size={20} /> No-card free tier
                  </span>
                  <span>•</span>
                  <span>AI usage is capped on Free and unlocked on Rocket</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Word of the Day Card */}
                <Card className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Vocabulary spotlight
                      </p>
                      <h2 className="font-slab text-h3 mt-1">Word of the day</h2>
                    </div>
                    <Badge variant="accent" size="sm">
                      Lexical Resource
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-2xl font-semibold text-foreground">serendipity</p>
                        <span className="text-xs text-muted">/ˌser.ənˈdɪp.ə.ti/</span>
                      </div>
                      <p className="mt-1 text-small text-muted">
                        the occurrence of events by chance in a happy or beneficial way
                      </p>
                    </div>

                    <p className="border-l-2 border-primary/40 pl-3 text-small text-primary/90 dark:text-primary">
                      “Finding a platform that understood my exact band goal felt like pure serendipity.”
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Badge variant="neutral" size="xs">Band 7+ vocab</Badge>
                      <span>•</span>
                      <span>Useful in Speaking Part 1 & Writing Task 2</span>
                    </div>

                    <div>
                      <Button asChild size="sm" variant="secondary" className="rounded-2xl">
                        <Link href="/vocabulary">Take 60-second vocab quiz</Link>
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Next launch window Card */}
                <Card className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Next launch window
                      </p>
                      <p className="text-small text-muted">
                        We onboard small cohorts so support never feels like a ticketing system.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-slab text-h3 leading-none">7 days</p>
                      <p className="text-xs text-muted">until next public batch</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs text-muted">
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">07</div>
                      <div>Days</div>
                    </div>
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">16</div>
                      <div>Hours</div>
                    </div>
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">45</div>
                      <div>Min</div>
                    </div>
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <div className="font-semibold text-foreground">30</div>
                      <div>Sec</div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-muted">
                    Join the waitlist now and we’ll reserve early-bird pricing for you when the batch opens.
                  </p>
                </Card>
              </div>
            </div>
          </Container>
        </section>

        {/* PORTAL HUB */}
        <section className="py-16 bg-muted/30">
          <Container>
            <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-slab text-h2">Portal hub</h2>
                <p className="mt-1 text-body text-muted">
                  From this page, you can jump to any core area — dashboard, modules, AI Lab, billing, or onboarding.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                All navigation lives here
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((item) => (
                <Card
                  key={item.href}
                  className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
                >
                  <Link href={item.href} className="flex h-full flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon name={item.icon} size={20} />
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-sm text-muted">{item.description}</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                        Open
                        <Icon name="ArrowRight" size={16} className="ml-1.5" />
                      </span>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* MODULES OVERVIEW */}
        <section className="py-16">
          <Container>
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Four modules + AI, one workspace
              </p>
              <h2 className="mt-2 font-slab text-h2">
                Everything you need to go from “stuck” to exam-ready.
              </h2>
              <p className="mt-3 text-body text-muted md:mx-auto md:max-w-2xl">
                Not just practice questions. A full stack: onboarding, learning, practice, mocks, AI feedback, analytics, and gamification — all aware of your goal band and exam date.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod) => (
                <Card
                  key={mod.id}
                  className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="space-y-5 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon name={mod.icon} size={24} />
                        </span>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">{mod.title}</h3>
                          <p className="mt-1 text-sm text-muted">{mod.description}</p>
                        </div>
                      </div>
                      <Badge
                        size="xs"
                        variant={
                          mod.statusTone === 'success' ? 'success' :
                          mod.statusTone === 'accent' ? 'accent' :
                          'neutral'
                        }
                      >
                        {mod.status}
                      </Badge>
                    </div>

                    <ul className="space-y-2 text-sm text-muted">
                      {mod.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Icon name="Check" size={16} className="mt-0.5 text-primary flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Button asChild variant="secondary" size="sm" className="w-full rounded-2xl">
                      <Link href={mod.href}>Open {mod.title}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-16 bg-muted/30">
          <Container>
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Real prep, real constraints
              </p>
              <h2 className="mt-2 font-slab text-h2">Built for people with limited time.</h2>
              <p className="mt-3 text-body text-muted md:mx-auto md:max-w-2xl">
                Evening learners, working professionals, undergrads — we optimize around your bandwidth, not around 6-hour study fantasies.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card
                  key={t.name}
                  className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
                >
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                        {t.initials}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-primary/80">{t.meta}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted">“{t.quote}”</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-success">
                    <Icon name="Medal" size={16} />
                    <span>{t.band}</span>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* PRICING PREVIEW */}
        <section className="py-16">
          <Container>
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Pricing preview
                </p>
                <h2 className="mt-1 font-slab text-h2">
                  Start free. Upgrade when you’re serious.
                </h2>
                <p className="mt-2 text-body text-muted md:max-w-xl">
                  Free covers basic practice and a taste of AI. Rocket unlocks deeper feedback and more mocks. Institutional is for teachers and academies.
                </p>
              </div>
              <Button asChild size="sm" variant="ghost" className="rounded-2xl">
                <Link href="/pricing">View full pricing page</Link>
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm ${
                    plan.highlight ? 'ring-1 ring-accent/60' : ''
                  }`}
                >
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{plan.name}</h3>
                        <p className="text-sm text-muted">{plan.price}</p>
                      </div>
                      <Badge size="xs" variant={plan.highlight ? 'accent' : 'neutral'}>
                        {plan.tag}
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-muted">
                      {plan.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Icon name="Check" size={16} className="mt-0.5 text-primary flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Button
                      asChild
                      variant={plan.id === 'rocket' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full rounded-2xl"
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

        {/* WAITLIST CTA */}
        <section className="py-16 bg-muted/30">
          <Container>
            <Card className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
              <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Pre-launch batch
                  </p>
                  <h2 className="font-slab text-h2">
                    Join the early cohort and lock in better pricing.
                  </h2>
                  <p className="text-body text-muted">
                    We’re onboarding in waves so we don’t drown support. Add your email and target band, and we’ll send a proper orientation when your batch opens — no spam, no fake urgency.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted">
                    <li>• First wave gets discounted Rocket pricing.</li>
                    <li>• Teachers / academies can request a separate call.</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <form className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="waitlist-email" className="block text-sm font-medium text-foreground">
                        Email
                      </label>
                      <Input
                        id="waitlist-email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="waitlist-band" className="block text-sm font-medium text-foreground">
                        Target IELTS band
                      </label>
                      <Input
                        id="waitlist-band"
                        type="text"
                        placeholder="e.g. 7.0, 7.5, 8.0"
                      />
                    </div>

                    <Button type="submit" variant="accent" className="w-full rounded-2xl">
                      Join waitlist
                    </Button>

                    <p className="text-xs text-muted text-center mt-2">
                      No spam. We’ll only email when your batch is actually opening.
                    </p>
                  </form>
                </div>
              </div>
            </Card>
          </Container>
        </section>
      </main>
    </Layout>
  );
}