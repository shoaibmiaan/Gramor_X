// pages/mock/writing/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

type IconName = React.ComponentProps<typeof Icon>['name'];

type QuickWritingAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: IconName;
};

type WritingTemplate = {
  id: string;
  title: string;
  description: string;
  examType: 'Academic' | 'General Training';
  taskType: 'Task 1' | 'Task 2' | 'Both';
  href: string;
};

type WritingTask = {
  id: string;
  label: string;
  estimate: string;
  href: string;
  focus: 'task2' | 'task1' | 'review';
};

// 🔥 Later you will wire this from DB
const hasWritingDraft = false;

const quickWritingActions: QuickWritingAction[] = [
  {
    id: 'start-task2',
    label: 'Start Writing Task 2 mock',
    description: '40-minute essay with strict timer + band scoring.',
    href: '/mock/writing/new',
    icon: 'PenSquare',
  },
  {
    id: 'open-history',
    label: 'View Writing attempts & feedback',
    description: 'See bands, comments, and improvement.',
    href: '/mock/writing/history',
    icon: 'BarChart3',
  },
  {
    id: 'improve-essay',
    label: 'Improve with AI feedback',
    description: 'Send your last essay to AI Lab for deeper corrections.',
    href: '/ai',
    icon: 'Sparkles',
  },
];

const writingTemplates: WritingTemplate[] = [
  {
    id: 'academic-both',
    title: 'Academic · Task 1 + Task 2 combo',
    description: 'Charts/graphs + essay. Full exam simulation.',
    examType: 'Academic',
    taskType: 'Both',
    href: '/mock/writing/new',
  },
  {
    id: 'academic-task2',
    title: 'Academic · Task 2 only',
    description: 'High-pressure 40-minute essay.',
    examType: 'Academic',
    taskType: 'Task 2',
    href: '/mock/writing/new',
  },
  {
    id: 'gt-task1',
    title: 'General Training · Task 1 letter',
    description: 'Formal / informal letters.',
    examType: 'General Training',
    taskType: 'Task 1',
    href: '/mock/writing/new',
  },
  {
    id: 'gt-task2',
    title: 'General Training · Task 2',
    description: 'Realistic GT essay prompts.',
    examType: 'General Training',
    taskType: 'Task 2',
    href: '/mock/writing/new',
  },
];

const writingTasks: WritingTask[] = [
  {
    id: 'today-task2',
    label: 'Write one Task 2 essay under exam time',
    estimate: '~40 mins',
    href: '/mock/writing/new',
    focus: 'task2',
  },
  {
    id: 'today-task1',
    label: 'Finish one Task 1 report/letter',
    estimate: '~20 mins',
    href: '/mock/writing/new',
    focus: 'task1',
  },
  {
    id: 'today-review',
    label: 'Fix 3 mistakes from your last essay',
    estimate: '~15 mins',
    href: '/mock/writing/history',
    focus: 'review',
  },
];

const WritingMockHomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Writing Mocks · GramorX</title>
        <meta
          name="description"
          content="IELTS Writing mocks for Task 1 and Task 2 with strict timing, band scoring, and AI feedback."
        />
      </Head>

      <main className="bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">

        {/* HERO */}
        <section className="pb-10 pt-10 md:pt-14">
          <Container>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-ds-full bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/60">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="PenSquare" size={14} />
                  </span>
                  <span>Writing Mock Room · Task 1 + Task 2</span>
                </div>

                <h1 className="font-slab text-display text-gradient-primary">
                  Writing mocks that show your real band.
                </h1>

                <p className="max-w-2xl text-small text-grayish">
                  Real prompts, strict timers, and AI feedback so you stop guessing and
                  actually improve.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground md:items-end">
                <Badge variant="neutral" size="sm">1 Task 2 essay/day recommended</Badge>
                <p>Your progress depends on consistency, not luck.</p>
              </div>
            </div>

            {/* START / RESUME BLOCK */}
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">

              <Card className="card-surface flex flex-col justify-between rounded-ds-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">

                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {hasWritingDraft ? 'Resume your mock' : 'Start a new Writing mock'}
                    </p>

                    {hasWritingDraft ? (
                      <p className="text-sm text-foreground">Continue the essay you were writing.</p>
                    ) : (
                      <p className="text-sm text-foreground">
                        Pick a prompt and write under strict IELTS timing.
                      </p>
                    )}

                  </div>

                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={hasWritingDraft ? 'PlayCircle' : 'PenSquare'} size={18} />
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {hasWritingDraft ? (
                    <>
                      <Button asChild variant="primary" size="md" className="rounded-ds-xl px-5">
                        <Link href="/mock/writing/draft">Resume Writing mock</Link>
                      </Button>

                      <Button asChild variant="secondary" size="md" className="rounded-ds-xl px-5">
                        <Link href="/mock/writing/new">Start new Writing mock</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="primary" size="md" className="rounded-ds-xl px-5">
                        <Link href="/mock/writing/new">Start new Writing mock</Link>
                      </Button>

                      <Button asChild variant="secondary" size="md" className="rounded-ds-xl px-5">
                        <Link href="/mock/writing/history">View Writing history</Link>
                      </Button>
                    </>
                  )}
                </div>
              </Card>

              {/* SNAPSHOT */}
              <Card className="card-surface rounded-ds-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Writing snapshot
                    </p>
                    <p className="text-xs text-grayish">Once wired with real data.</p>
                  </div>
                  <Icon name="PieChart" size={20} className="text-muted-foreground" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Best Writing band', icon: 'Medal' },
                    { label: 'Biggest weakness', icon: 'Target' },
                    { label: 'Avg time / essay', icon: 'Clock' },
                  ].map((stat, idx) => (
                    <div key={idx} className="rounded-ds-xl bg-muted/60 px-3 py-3 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon name={stat.icon as IconName} size={14} />
                        <span>{stat.label}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">—</p>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          </Container>
        </section>

        {/* QUICK ACTIONS */}
        <section className="pb-12">
          <Container>
            <div className="mb-4">
              <h2 className="font-slab text-h2">Start or explore Writing</h2>
              <p className="text-small text-grayish">No fluff. Pick something and write.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickWritingActions.map((action) => (
                <Card key={action.id} className="group flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-4 transition hover:-translate-y-1 hover:shadow-lg">
                  <Link href={action.href} className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon name={action.icon} size={18} />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>

                    <span className="mt-auto inline-flex items-center text-xs font-medium text-primary group-hover:underline">
                      Open <Icon name="ArrowRight" size={14} className="ml-1" />
                    </span>
                  </Link>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* WRITING TEMPLATES */}
        <section className="bg-muted/40 py-12">
          <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Writing mock templates</p>
                <h2 className="mt-1 font-slab text-h2">Pick the exam format.</h2>
                <p className="mt-1 max-w-2xl text-small text-grayish">
                  Academic / General Training, Task 1 / Task 2. Everything structured like the real exam.
                </p>
              </div>

              <Button asChild variant="secondary" size="sm" className="rounded-ds-xl">
                <Link href="/mock/writing/history">Open Writing library</Link>
              </Button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {writingTemplates.map((tpl) => (
                <Card key={tpl.id} className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{tpl.title}</h3>
                      <div className="flex gap-1">
                        <Badge size="xs" variant={tpl.examType === 'Academic' ? 'info' : 'neutral'}>{tpl.examType}</Badge>
                        <Badge size="xs" variant={tpl.taskType === 'Task 2' ? 'danger' : 'neutral'}>{tpl.taskType}</Badge>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  </div>

                  <div className="pt-4">
                    <Button asChild variant="primary" size="sm" className="w-full rounded-ds-xl">
                      <Link href={tpl.href}>Start this mock</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* TODAY'S WRITING TASKS */}
        <section className="py-12">
          <Container>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Today’s Writing plan
              </p>
              <h2 className="mt-1 font-slab text-h2">Minimum Writing work for today.</h2>
              <p className="mt-1 max-w-2xl text-small text-grayish">
                Even on busy days: one essay or one mistake-fix session.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {writingTasks.map((task) => (
                <Card key={task.id} className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Icon
                          name={
                            task.focus === 'task2'
                              ? 'PenSquare'
                              : task.focus === 'task1'
                              ? 'FileText'
                              : 'Sparkles'
                          }
                          size={14}
                        />
                        <span className="capitalize">
                          {task.focus === 'review' ? 'Review' : task.focus}
                        </span>
                      </span>

                      <span className="text-[11px] text-muted-foreground">{task.estimate}</span>
                    </div>

                    <p className="text-sm font-semibold text-foreground">{task.label}</p>
                  </div>

                  <Button asChild variant="primary" size="sm" className="mt-3 w-full rounded-ds-xl">
                    <Link href={task.href}>Start now</Link>
                  </Button>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* AI IMPROVEMENT BLOCK */}
        <section className="bg-muted/40 pb-14 pt-10">
          <Container>
            <Card className="mx-auto max-w-4xl rounded-ds-2xl bg-card/90 p-6 border border-border/60">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Next smart move
                  </p>
                  <h2 className="font-slab text-h3">Fix one essay properly.</h2>
                  <p className="text-small text-grayish">
                    Don’t churn 20 essays. Take one → get AI feedback → improve → re-submit.
                    That’s how bands actually rise.
                  </p>
                </div>

                <div className="space-y-3 rounded-ds-2xl bg-muted p-4 text-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Icon name="Sparkles" size={14} />
                    <span>Recommended Writing flow</span>
                  </div>

                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li>1. Write a Task 2 or Task 1 mock.</li>
                    <li>2. Submit and save the attempt.</li>
                    <li>3. Send it to AI Lab for deep corrections.</li>
                    <li>4. Rewrite using feedback.</li>
                  </ol>

                  <div className="flex gap-2">
                    <Button asChild variant="secondary" size="sm" className="w-full rounded-ds-xl">
                      <Link href="/ai">Open AI Lab</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="w-full rounded-ds-xl">
                      <Link href="/mock/writing/history">View attempts</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Container>
        </section>

      </main>
    </>
  );
};

export default WritingMockHomePage;
