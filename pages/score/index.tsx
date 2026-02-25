// pages/score/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';
import { track } from '@/lib/analytics/track';

type ModuleBand = {
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  band: number | null;
  attempts: number;
  bestBand: number | null;
};

type QuestionFamilyStat = {
  label: string;
  correct: number;
  total: number;
};

type RecentAttempt = {
  id: string;
  label: string;
  skill: string;
  band: number | null;
  correct: number;
  total: number;
  date: string;
  durationMinutes: number;
};

const mockOverall = {
  currentBand: 5.5,
  targetBand: 7.0,
  xpTotal: 2480,
  xpToNextLevel: 520,
  percentile: 68, // top 32%
};

const mockModuleBands: ModuleBand[] = [
  { skill: 'Listening', band: 6.0, attempts: 9, bestBand: 6.5 },
  { skill: 'Reading', band: 5.5, attempts: 7, bestBand: 6.0 },
  { skill: 'Writing', band: 5.0, attempts: 4, bestBand: 5.5 },
  { skill: 'Speaking', band: 5.5, attempts: 3, bestBand: 6.0 },
];

const mockQuestionFamilies: QuestionFamilyStat[] = [
  { label: 'TFNG / YNNG', correct: 12, total: 20 },
  { label: 'Gap-fill', correct: 18, total: 26 },
  { label: 'MCQ', correct: 15, total: 24 },
  { label: 'Matching', correct: 11, total: 18 },
  { label: 'Diagram / Map', correct: 5, total: 10 },
];

const mockRecentAttempts: RecentAttempt[] = [
  {
    id: 'reading-practice-01',
    label: 'Reading Practice Test 1 — Urban Futures',
    skill: 'Reading',
    band: 5.0,
    correct: 18,
    total: 40,
    date: 'Today · 3:41 PM',
    durationMinutes: 58,
  },
  {
    id: 'listening-mock-02',
    label: 'Listening Mock 2 — Campus Services',
    skill: 'Listening',
    band: 6.0,
    correct: 32,
    total: 40,
    date: 'Yesterday · 9:12 PM',
    durationMinutes: 33,
  },
  {
    id: 'reading-practice-02',
    label: 'Reading Practice Test 2 — Work Futures',
    skill: 'Reading',
    band: 5.5,
    correct: 21,
    total: 40,
    date: 'Tue · 8:05 PM',
    durationMinutes: 54,
  },
];

const percent = (num: number, den: number) =>
  den === 0 ? 0 : Math.round((num / den) * 100);

export default function ScoreCardPage() {
  React.useEffect(() => {
    track('scorecard_view');
  }, []);

  const xpProgress =
    mockOverall.xpTotal /
    (mockOverall.xpTotal + mockOverall.xpToNextLevel || 1);

  return (
    <>
      <Head>
        <title>Score Card • GramorX</title>
        <meta
          name="description"
          content="Your IELTS band, XP, skill strengths, and recent attempts in one score card."
        />
      </Head>

      <section className="py-20 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* Header */}
          <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Analytics
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your IELTS Score Card
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Live band estimate, XP progress, and weak areas based on your
                practice and mocks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone="primary" size="lg">
                <Icon name="sparkles" className="mr-1 h-4 w-4" />
                Beta analytics
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="hidden items-center gap-1 text-xs sm:inline-flex"
                onClick={() => track('scorecard_help_clicked')}
              >
                <Icon name="help-circle" className="h-4 w-4" />
                How is my band calculated?
              </Button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
            {/* Left: band + XP */}
            <Card className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Overall band estimate
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-semibold">
                      {mockOverall.currentBand.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Target {mockOverall.targetBand.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Based on your last 10 full and module mocks.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm dark:border-gray-700 dark:bg-black/40">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    XP Level
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {mockOverall.xpTotal.toLocaleString()} XP
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mockOverall.xpToNextLevel} XP to next tier
                  </p>
                </div>
              </div>

              {/* XP bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Progress to next XP tier</span>
                  <span>{Math.round(xpProgress * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200/70 dark:bg-black/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    style={{ width: `${Math.min(100, xpProgress * 100)}%` }}
                  />
                </div>
              </div>

              {/* Percentile + CTA */}
              <div className="flex flex-col gap-3 border-t border-dashed border-gray-200 pt-4 text-sm dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-gray-600 dark:text-gray-300">
                  You’re currently ahead of{' '}
                  <span className="font-semibold">
                    {mockOverall.percentile}%
                  </span>{' '}
                  of learners on GramorX.
                </p>
                <div className="flex gap-2">
                  <Link href="/mock">
                    <Button size="sm">
                      Start a new mock
                      <Icon name="arrow-right" className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="sm" variant="subtle">
                      Go to dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Right: module bands */}
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Band by skill</p>
                <Badge tone="neutral" size="sm">
                  Last 10 attempts
                </Badge>
              </div>

              <div className="space-y-3">
                {mockModuleBands.map((m) => (
                  <div
                    key={m.skill}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-black/40"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{m.skill}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {m.attempts} attempts · best band{' '}
                        {m.bestBand?.toFixed(1) ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {m.band?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        band
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/leaderboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 inline-flex items-center gap-1 self-start text-xs"
                  onClick={() => track('scorecard_leaderboard_cta')}
                >
                  View global leaderboard
                  <Icon name="chevron-right" className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </Card>
          </div>

          {/* Question families + recent attempts */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
            {/* Question families */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Performance by question type
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Find the patterns in where you drop marks.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mockQuestionFamilies.map((q) => {
                  const p = percent(q.correct, q.total);
                  return (
                    <div
                      key={q.label}
                      className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-3 text-xs shadow-sm dark:border-gray-800 dark:bg-black/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{q.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                            p >= 70
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : p >= 40
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                          }`}
                        >
                          {p}% correct
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200/80 dark:bg-black/30">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      <span className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                        {q.correct}/{q.total} questions correct
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent attempts */}
            <Card className="flex h-full flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Recent attempts</p>
                <Badge tone="neutral" size="sm">
                  Last 7 days
                </Badge>
              </div>

              <div className="flex-1 space-y-3">
                {mockRecentAttempts.map((a) => {
                  const p = percent(a.correct, a.total);
                  return (
                    <Link
                      key={a.id}
                      href={
                        a.skill === 'Reading'
                          ? `/review/reading/${a.id}`
                          : `/review/listening/${a.id}`
                      }
                      onClick={() =>
                        track('scorecard_recent_attempt_click', {
                          attemptId: a.id,
                          skill: a.skill,
                        })
                      }
                    >
                      <div className="group flex cursor-pointer items-start justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs shadow-sm transition hover:border-indigo-500 hover:bg-indigo-50/50 dark:border-gray-800 dark:bg-black/40 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/20">
                        <div>
                          <p className="max-w-xs truncate text-[0.8rem] font-medium">
                            {a.label}
                          </p>
                          <p className="mt-0.5 text-[0.7rem] text-gray-500 dark:text-gray-400">
                            {a.skill} · {a.date} · {a.durationMinutes} min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.8rem] font-semibold">
                            {a.band?.toFixed(1) ?? '—'} band
                          </p>
                          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                            {a.correct}/{a.total} ({p}%)
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Link href="/mock" className="mt-3 self-start">
                <Button
                  variant="ghost"
                  size="sm"
                  className="inline-flex items-center gap-1 text-xs"
                >
                  View full history
                  <Icon name="clock" className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
