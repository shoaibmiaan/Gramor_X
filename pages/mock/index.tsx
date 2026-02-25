// pages/mock/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

type IconName = React.ComponentProps<typeof Icon>['name'];

type QuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: IconName;
};

type ModuleShortcut = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: IconName;
  status: 'Live' | 'Beta' | 'Coming soon';
  statusTone: 'success' | 'info' | 'neutral';
};

type StatHighlight = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  icon: IconName;
};

type TodayTask = {
  id: string;
  label: string;
  estimate: string;
  href: string;
  type: 'reading' | 'listening' | 'writing' | 'speaking';
};

const quickActions: QuickAction[] = [
  {
    id: 'full-mock',
    label: 'Start full IELTS mock',
    description: 'All four modules, strict timer, one continuous flow.',
    href: '/mock/full',
    icon: 'Timer',
  },
  {
    id: 'resume-latest',
    label: 'Resume latest mock',
    description: 'Jump back into your last unfinished attempt.',
    href: '/mock/history',
    icon: 'PlayCircle',
  },
  {
    id: 'view-results',
    label: 'View my mock results',
    description: 'See bands, mistakes, and progress over time.',
    href: '/mock/history',
    icon: 'BarChart3',
  },
];

const moduleShortcuts: ModuleShortcut[] = [
  {
    id: 'reading',
    title: 'Reading mocks',
    description: 'Three passages, 40 questions, strict IELTS layout.',
    href: '/mock/reading',
    icon: 'BookOpenCheck',
    status: 'Live',
    statusTone: 'success',
  },
  {
    id: 'listening',
    title: 'Listening mocks',
    description: 'Four sections with single-play audio and answer sheet.',
    href: '/mock/listening',
    icon: 'Headphones',
    status: 'Live',
    statusTone: 'success',
  },
  {
    id: 'writing',
    title: 'Writing mocks',
    description: 'Task 1 + Task 2 with AI-first band feedback.',
    href: '/mock/writing',
    icon: 'PenSquare',
    status: 'Beta',
    statusTone: 'info',
  },
  {
    id: 'speaking',
    title: 'Speaking mocks',
    description: 'Parts 1–3 simulated with recording and transcripts.',
    href: '/mock/speaking',
    icon: 'Mic',
    status: 'Beta',
    statusTone: 'info',
  },
];

const statHighlights: StatHighlight[] = [
  {
    id: 'best-band',
    label: 'Best mock band',
    value: '—',
    helper: 'Updated after your first full mock.',
    icon: 'Medal',
  },
  {
    id: 'attempts-count',
    label: 'Total mocks taken',
    value: '—',
    helper: 'Full tests across all modules.',
    icon: 'Activity',
  },
  {
    id: 'last-activity',
    label: 'Last mock activity',
    value: '—',
    helper: 'Shows when you last entered an exam room.',
    icon: 'Clock',
  },
];

const todayTasks: TodayTask[] = [
  {
    id: 'reading-mini',
    label: 'Finish one Reading mock section',
    estimate: '~20 mins',
    href: '/mock/reading',
    type: 'reading',
  },
  {
    id: 'listening-mini',
    label: 'Do a Listening mock with strict timer',
    estimate: '~35 mins',
    href: '/mock/listening',
    type: 'listening',
  },
  {
    id: 'writing-mini',
    label: 'Attempt one Writing Task 2 under exam conditions',
    estimate: '~40 mins',
    href: '/mock/writing',
    type: 'writing',
  },
];

const MockHomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Mock Tests · GramorX</title>
        <meta
          name="description"
          content="Exam-style IELTS mocks for Listening, Reading, Writing, and Speaking with strict timers, analytics, and AI-first feedback."
        />
      </Head>

      <main className="bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        {/* HERO / CONTROL STRIP */}
        <section className="pb-10 pt-10 md:pt-14">
          <Container>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-ds-full bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/60">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="Timer" size={14} />
                  </span>
                  <span>Mock Mission Control · Strict IELTS-style exams</span>
                </div>
                <h1 className="font-slab text-display text-gradient-primary">
                  Full IELTS mocks, one control room.
                </h1>
                <p className="max-w-2xl text-small text-grayish">
                  Start or resume serious, timed mocks for all four modules. No fluff —
                  just exam rooms, timers, and post-test analytics.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground md:items-end">
                <Badge variant="neutral" size="sm">
                  Recommended: 1 full mock / week
                </Badge>
                <p>Use mocks to measure. Fix mistakes in AI Lab, not inside the exam.</p>
              </div>
            </div>

            {/* PRIMARY STRIP: CONTINUE + SNAPSHOT */}
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
              <Card className="card-surface flex flex-col justify-between rounded-ds-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Continue where you left off
                    </p>
                    <p className="text-sm text-foreground">
                      Once you attempt a mock, your latest attempt will show here so you
                      can jump straight back into the exam room.
                    </p>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="PlayCircle" size={18} />
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    asChild
                    variant="primary"
                    size="md"
                    className="rounded-ds-xl px-5"
                  >
                    <Link href="/mock/full">Start full IELTS mock</Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    size="md"
                    className="rounded-ds-xl px-5"
                  >
                    <Link href="/mock/history">Resume / view attempts</Link>
                  </Button>
                </div>
              </Card>

              <Card className="card-surface rounded-ds-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Quick snapshot
                    </p>
                    <p className="text-xs text-grayish">
                      Later this will show real mock stats: band trajectory, attempts, last
                      activity.
                    </p>
                  </div>
                  <Icon name="PieChart" size={18} className="text-muted-foreground" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {statHighlights.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-ds-xl bg-muted/60 px-3 py-3 text-xs"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon name={item.icon} size={14} />
                        <span>{item.label}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {item.value}
                      </p>
                      {item.helper ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.helper}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Container>
        </section>

        {/* START / RESUME ACTIONS */}
        <section className="pb-12">
          <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-slab text-h2">Start or resume mocks</h2>
                <p className="text-small text-grayish">
                  Pick how hard you want to go today — full exam, single-module mock, or
                  just reviewing your last attempt.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action) => (
                <Card
                  key={action.id}
                  className="group flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-4 transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg"
                >
                  <Link href={action.href} className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon name={action.icon} size={18} />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {action.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <span className="mt-auto inline-flex items-center text-xs font-medium text-primary group-hover:underline">
                      Open
                      <Icon name="ArrowRight" size={14} className="ml-1" />
                    </span>
                  </Link>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* MODULE MOCK SHORTCUTS */}
        <section className="bg-muted/40 py-12">
          <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Module mocks
                </p>
                <h2 className="mt-1 font-slab text-h2">
                  Jump into a specific IELTS module.
                </h2>
                <p className="mt-1 max-w-2xl text-small text-grayish">
                  Each module uses strict computer-based layouts and timing so your brain
                  gets used to the real exam flow.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                Best for weekly “check-in” mocks
              </Badge>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {moduleShortcuts.map((mod) => (
                <Card
                  key={mod.id}
                  className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:bg-card/90 hover:shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Icon name={mod.icon} size={20} />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {mod.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        size="xs"
                        variant={
                          mod.statusTone === 'success'
                            ? 'success'
                            : mod.statusTone === 'info'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {mod.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="w-full rounded-ds-xl"
                    >
                      <Link href={mod.href}>Open {mod.title}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* TODAY'S MOCK TASKS */}
        <section className="py-12">
          <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Today’s mock plan
                </p>
                <h2 className="mt-1 font-slab text-h2">Do at least one serious attempt.</h2>
                <p className="mt-1 max-w-2xl text-small text-grayish">
                  If you can’t do a full exam today, at least complete one focused mock. No
                  zero days.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                Will be AI-generated later
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {todayTasks.map((task) => (
                <Card
                  key={task.id}
                  className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Icon
                          name={
                            task.type === 'reading'
                              ? 'BookOpenCheck'
                              : task.type === 'listening'
                              ? 'Headphones'
                              : task.type === 'writing'
                              ? 'PenSquare'
                              : 'Mic'
                          }
                          size={14}
                        />
                        <span className="capitalize">{task.type}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {task.estimate}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{task.label}</p>
                  </div>
                  <div className="pt-3">
                    <Button
                      asChild
                      size="sm"
                      variant="primary"
                      className="w-full rounded-ds-xl"
                    >
                      <Link href={task.href}>Start now</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* RECOMMENDATION / AI HOOK */}
        <section className="bg-muted/40 pb-14 pt-10">
          <Container>
            <Card className="mx-auto max-w-4xl rounded-ds-2xl border border-border/60 bg-card/90 p-6 md:p-7">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] md:items-center">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Next smart move
                  </p>
                  <h2 className="font-slab text-h3">
                    Review mocks in AI Lab before taking the next one.
                  </h2>
                  <p className="text-small text-grayish">
                    After every serious mock, send it to AI Lab. It will break down band
                    scores, errors, and give you a concrete plan — so the next mock isn’t
                    just “vibes”.
                  </p>
                </div>
                <div className="space-y-3 rounded-ds-2xl bg-muted p-4 text-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Icon name="Sparkles" size={14} />
                    <span>Recommended flow</span>
                  </div>
                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li>1. Take one full or module mock from this page.</li>
                    <li>2. Submit and view your result.</li>
                    <li>3. Open AI Lab → send your attempt for deep feedback.</li>
                    <li>4. Fix weaknesses → come back here for the next mock.</li>
                  </ol>
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="mt-2 w-full rounded-ds-xl"
                  >
                    <Link href="/ai">Open AI Lab</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </Container>
        </section>
      </main>
    </>
  );
};

export default MockHomePage;
