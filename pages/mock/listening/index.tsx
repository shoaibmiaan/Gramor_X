// pages/mock/listening/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';
import { getServerClient } from '@/lib/supabaseServer';

// -----------------------------------------------------------------------------
// Page Props
// -----------------------------------------------------------------------------
type PageProps = {
  startMockHref: string;
};

// You can wire this later from listening_attempts
const hasListeningDraft = false;

// -----------------------------------------------------------------------------
// Quick Actions (static)
// -----------------------------------------------------------------------------
const quickListeningActions = [
  {
    id: 'start-full',
    label: 'Start full Listening mock',
    description: 'Four sections, 40 questions, strict single-play audio.',
    href: '/mock/listening/new',
    icon: 'Headphones' as const,
  },
  {
    id: 'history',
    label: 'View Listening mock history',
    description: 'Bands, attempts, and timing for past tests.',
    href: '/mock/listening/history',
    icon: 'BarChart3' as const,
  },
  {
    id: 'analytics',
    label: 'Open Listening analytics',
    description: 'Spot weak sections and question types.',
    href: '/analytics/listening',
    icon: 'PieChart' as const,
  },
];

// -----------------------------------------------------------------------------
// Sets (static)
// -----------------------------------------------------------------------------
const listeningSets = [
  {
    id: 'full-academic',
    title: 'Full IELTS Listening mock',
    description: 'All four sections, one sitting, strict CBE layout.',
    level: 'Standard' as const,
    meta: '4 sections · ~30–35 mins',
    href: '/mock/listening/new',
  },
  {
    id: 'section1-focus',
    title: 'Section 1 · Conversation',
    description: 'Train note-taking and spelling under low-pressure audio.',
    level: 'Easier' as const,
    meta: '1 section · ~8–10 mins',
    href: '/mock/listening/new',
  },
  {
    id: 'section3-focus',
    title: 'Section 3 · Discussion',
    description: 'Harder, fast-paced discussion with multiple speakers.',
    level: 'Challenging' as const,
    meta: '1 section · ~8–10 mins',
    href: '/mock/listening/new',
  },
  {
    id: 'mixed-difficult',
    title: 'Mixed difficult set',
    description: 'Pulled from tougher tests for band 7+ practice.',
    level: 'Challenging' as const,
    meta: '2 sections · ~15–18 mins',
    href: '/mock/listening/new',
  },
];

// -----------------------------------------------------------------------------
// Today’s tasks (static)
// -----------------------------------------------------------------------------
const listeningTasks = [
  {
    id: 'today-full',
    label: 'Do one full Listening mock under exam rules',
    estimate: '~35 mins',
    href: '/mock/listening/new',
    focus: 'section1' as const,
  },
  {
    id: 'today-section3',
    label: 'Hit one Section 3 for difficulty training',
    estimate: '~10 mins',
    href: '/mock/listening/new',
    focus: 'section3' as const,
  },
  {
    id: 'today-weakness',
    label: 'Fix 5 mistakes from your last Listening test',
    estimate: '~15 mins',
    href: '/mock/listening/history',
    focus: 'weakness' as const,
  },
];

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------
const ListeningMockHomePage: NextPage<PageProps> = ({ startMockHref }) => {
  return (
    <>
      <Head>
        <title>Listening Mocks · GramorX</title>
        <meta
          name="description"
          content="Strict IELTS Listening mocks with four sections, single-play audio, and analytics so you train exactly like the real computer-based exam."
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
                    <Icon name="Headphones" size={14} />
                  </span>
                  <span>Listening Mock Room · Strict CBE + single-play audio</span>
                </div>

                <h1 className="font-slab text-display text-gradient-primary">
                  Listening mocks that feel like exam day.
                </h1>

                <p className="max-w-2xl text-small text-grayish">
                  Same four-section flow, same timing stress — but with analytics and AI
                  feedback waiting after you submit.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground md:items-end">
                <Badge variant="neutral" size="sm">
                  Minimum: 2 Listening mocks / week
                </Badge>
                <p>Use /listening for practice. This page is for strict mocks only.</p>
              </div>
            </div>

            {/* START BLOCK */}
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
              <Card className="card-surface flex flex-col justify-between rounded-ds-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {hasListeningDraft ? 'Resume Listening mock' : 'Start a new Listening mock'}
                    </p>

                    <p className="text-sm text-foreground">
                      {hasListeningDraft
                        ? 'Continue the mock you paused. Audio + timer rules stay strict.'
                        : 'Start a full four-section Listening test with exam-style controls.'}
                    </p>
                  </div>

                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={hasListeningDraft ? 'PlayCircle' : 'Headphones'} size={18} />
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {hasListeningDraft ? (
                    <>
                      <Button asChild variant="primary" size="md" className="rounded-ds-xl px-5">
                        <Link href="/mock/listening/draft">Resume Listening mock</Link>
                      </Button>
                      <Button asChild variant="secondary" size="md" className="rounded-ds-xl px-5">
                        <Link href={startMockHref}>Start new Listening mock</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="primary" size="md" className="rounded-ds-xl px-5">
                        <Link href={startMockHref}>Start new Listening mock</Link>
                      </Button>
                      <Button asChild variant="secondary" size="md" className="rounded-ds-xl px-5">
                        <Link href="/mock/listening/history">View Listening history</Link>
                      </Button>
                    </>
                  )}
                </div>
              </Card>

              {/* SNAPSHOT BLOCK */}
              <Card className="card-surface rounded-ds-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Listening snapshot
                    </p>
                    <p className="text-xs text-grayish">
                      This will show your band history later.
                    </p>
                  </div>
                  <Icon name="PieChart" size={18} className="text-muted-foreground" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-ds-xl bg-muted/60 px-3 py-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Medal" size={14} />
                      <span>Best band</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">—</p>
                  </div>

                  <div className="rounded-ds-xl bg-muted/60 px-3 py-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Target" size={14} />
                      <span>Weakest section</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">—</p>
                  </div>

                  <div className="rounded-ds-xl bg-muted/60 px-3 py-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Clock" size={14} />
                      <span>Avg time / Q</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">—</p>
                  </div>
                </div>
              </Card>
            </div>
          </Container>
        </section>

        {/* QUICK ACTIONS */}
        <section className="pb-12">
          <Container>
            <div className="mb-4">
              <h2 className="font-slab text-h2">Start or explore Listening mocks</h2>
              <p className="text-small text-grayish">This area is exam-only. No transcripts.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickListeningActions.map((action) => {
                const href = action.id === 'start-full' ? startMockHref : action.href;

                return (
                  <Card
                    key={action.id}
                    className="group flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-4 transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg"
                  >
                    <Link href={href} className="flex h-full flex-col gap-3">
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
                        Open
                        <Icon name="ArrowRight" size={14} className="ml-1" />
                      </span>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </Container>
        </section>

        {/* MOCK SETS */}
        <section className="bg-muted/40 py-12">
          <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Listening mock sets
                </p>
                <h2 className="mt-1 font-slab text-h2">Choose your pressure level.</h2>
                <p className="mt-1 max-w-2xl text-small text-grayish">
                  Full tests when you have time, single sections when you don’t.
                </p>
              </div>

              <Button asChild size="sm" variant="secondary" className="rounded-ds-xl">
                <Link href="/mock/listening/history">Open Listening library</Link>
              </Button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {listeningSets.map((set) => {
                const href = set.href === '/mock/listening/new' ? startMockHref : set.href;

                return (
                  <Card
                    key={set.id}
                    className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:bg-card/90 hover:shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">{set.title}</h3>

                        <Badge
                          size="xs"
                          variant={
                            set.level === 'Challenging'
                              ? 'danger'
                              : set.level === 'Standard'
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {set.level}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">{set.description}</p>
                      <p className="text-xs font-medium text-muted-foreground">{set.meta}</p>
                    </div>

                    <div className="pt-4">
                      <Button asChild size="sm" variant="primary" className="w-full rounded-ds-xl">
                        <Link href={href}>Start this mock</Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Container>
        </section>

        {/* TODAY’S TASKS */}
        <section className="py-12">
          <Container>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Today’s Listening plan
              </p>
              <h2 className="mt-1 font-slab text-h2">Minimum Listening work.</h2>
              <p className="mt-1 max-w-2xl text-small text-grayish">
                On busy days: one mock or one hard section. No off days.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {listeningTasks.map((task) => {
                const href = task.href === '/mock/listening/new' ? startMockHref : task.href;

                return (
                  <Card
                    key={task.id}
                    className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/80 p-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Icon
                            name={
                              task.focus === 'section1'
                                ? 'MessageCircle'
                                : task.focus === 'section3'
                                ? 'Users'
                                : 'AlertTriangle'
                            }
                            size={14}
                          />
                          <span className="capitalize">
                            {task.focus === 'weakness'
                              ? 'Weakness drill'
                              : `Section ${task.focus === 'section1' ? '1' : '3'}`}
                          </span>
                        </span>

                        <span className="text-[11px] text-muted-foreground">
                          {task.estimate}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-foreground">{task.label}</p>
                    </div>

                    <Button asChild variant="primary" size="sm" className="mt-3 w-full rounded-ds-xl">
                      <Link href={href}>Start now</Link>
                    </Button>
                  </Card>
                );
              })}
            </div>
          </Container>
        </section>

        {/* AI FLOW */}
        <section className="bg-muted/40 pb-14 pt-10">
          <Container>
            <Card className="mx-auto max-w-4xl rounded-ds-2xl border border-border/60 bg-card/90 p-6 md:p-7">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] md:items-center">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Next smart move
                  </p>

                  <h2 className="font-slab text-h3">Don’t just repeat mocks. Fix patterns.</h2>

                  <p className="text-small text-grayish">
                    After each Listening mock, send it to AI Lab. It shows which sections
                    and question types are killing your band.
                  </p>
                </div>

                <div className="space-y-3 rounded-ds-2xl bg-muted p-4 text-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Icon name="Sparkles" size={14} />
                    <span>Recommended Listening flow</span>
                  </div>

                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li>1. Take a strict Listening mock from this page.</li>
                    <li>2. Submit → see your raw score & band.</li>
                    <li>3. Open AI Lab → send attempt for analysis.</li>
                    <li>4. Do one weakness drill.</li>
                  </ol>

                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" variant="secondary" className="w-full rounded-ds-xl">
                      <Link href="/ai">Open AI Lab</Link>
                    </Button>

                    <Button asChild size="sm" variant="ghost" className="w-full rounded-ds-xl">
                      <Link href="/mock/listening/history">View Listening attempts</Link>
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

// -----------------------------------------------------------------------------
// Server-side: Fetch random published mock from listening_tests
// -----------------------------------------------------------------------------
export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  const { data, error } = await supabase
    .from('listening_tests')
    .select('slug')
    .eq('is_mock', true)
    .eq('is_published', true);

  let startMockHref = '/mock/listening/history';

  if (!error && data && data.length > 0) {
    const randomIndex = Math.floor(Math.random() * data.length);
    const slug = data[randomIndex].slug;
    // 👉 now sends user to the TEST DETAIL PAGE, not straight to exam
    startMockHref = `/mock/listening/${encodeURIComponent(slug ?? '')}`;
  }

  return {
    props: { startMockHref },
  };
};

export default ListeningMockHomePage;
