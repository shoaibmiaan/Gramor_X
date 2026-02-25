// pages/leaderboard/index.tsx
import * as React from 'react';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';
import { track } from '@/lib/analytics/track';

type LeaderboardEntry = {
  rank: number;
  name: string;
  country: string;
  xp: number;
  band: number | null;
  attempts: number;
  streakDays: number;
  you?: boolean;
};

const mockGlobal: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Sara K.',
    country: '🇦🇺',
    xp: 9820,
    band: 8.5,
    attempts: 63,
    streakDays: 41,
  },
  {
    rank: 2,
    name: 'Daniel R.',
    country: '🇬🇧',
    xp: 9430,
    band: 8.0,
    attempts: 57,
    streakDays: 36,
  },
  {
    rank: 3,
    name: 'Ayesha M.',
    country: '🇵🇰',
    xp: 9105,
    band: 7.5,
    attempts: 52,
    streakDays: 29,
  },
  {
    rank: 17,
    name: 'You',
    country: '🇵🇰',
    xp: 7420,
    band: 7.0,
    attempts: 39,
    streakDays: 12,
    you: true,
  },
];

const mockWeekly: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Liam C.',
    country: '🇨🇦',
    xp: 1320,
    band: 7.0,
    attempts: 9,
    streakDays: 7,
  },
  {
    rank: 2,
    name: 'You',
    country: '🇵🇰',
    xp: 1210,
    band: 6.5,
    attempts: 8,
    streakDays: 5,
    you: true,
  },
  {
    rank: 3,
    name: 'Mei L.',
    country: '🇸🇬',
    xp: 1105,
    band: 7.5,
    attempts: 7,
    streakDays: 4,
  },
];

type TabKey = 'global' | 'weekly' | 'reading' | 'listening';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'global', label: 'Global XP' },
  { key: 'weekly', label: 'This week' },
  { key: 'reading', label: 'Reading band' },
  { key: 'listening', label: 'Listening band' },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>('global');

  React.useEffect(() => {
    track('leaderboard_view', { tab: activeTab });
  }, [activeTab]);

  const entries =
    activeTab === 'weekly'
      ? mockWeekly
      : activeTab === 'global'
      ? mockGlobal
      : mockGlobal; // placeholder – plug in per-skill lists later

  return (
    <>
      <Head>
        <title>Leaderboards • GramorX</title>
        <meta
          name="description"
          content="See how your IELTS prep ranks against other GramorX learners worldwide."
        />
      </Head>

      <section className="py-20 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* Header */}
          <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Competitive mode
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Leaderboards
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                XP, bands, and streak rankings. Filter by time period and skill
                to see where you stand.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone="primary" size="lg">
                <Icon name="trophy" className="mr-1 h-4 w-4" />
                Seasons coming soon
              </Badge>
            </div>
          </header>

          {/* Tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  activeTab === tab.key
                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:bg-black/40 dark:text-gray-200 dark:hover:border-indigo-400'
                }`}
              >
                {tab.key === 'global' && (
                  <Icon name="globe-2" className="h-3.5 w-3.5" />
                )}
                {tab.key === 'weekly' && (
                  <Icon name="zap" className="h-3.5 w-3.5" />
                )}
                {tab.key === 'reading' && (
                  <Icon name="book-open" className="h-3.5 w-3.5" />
                )}
                {tab.key === 'listening' && (
                  <Icon name="headphones" className="h-3.5 w-3.5" />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
            {/* Main table */}
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 text-xs dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {activeTab === 'weekly'
                      ? 'This week’s top learners'
                      : 'Global leaderboard'}
                  </span>
                  <Badge tone="neutral" size="sm">
                    {entries.length} entries
                  </Badge>
                </div>
                <span className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                  Usernames are partially anonymised.
                </span>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-[0.7rem] uppercase tracking-[0.14em] text-gray-500 dark:bg-black/60 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-2">Rank</th>
                      <th className="px-3 py-2">Learner</th>
                      <th className="px-3 py-2">XP</th>
                      <th className="px-3 py-2">Band</th>
                      <th className="px-3 py-2">Attempts</th>
                      <th className="px-3 py-2">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr
                        key={`${activeTab}-${e.rank}-${e.name}`}
                        className={`border-t border-gray-100 text-[0.8rem] dark:border-gray-800 ${
                          e.you
                            ? 'bg-indigo-50/70 font-semibold dark:bg-indigo-900/40'
                            : 'bg-white dark:bg-black/40'
                        }`}
                      >
                        <td className="px-5 py-2 align-middle">
                          <div className="flex items-center gap-1">
                            {e.rank <= 3 ? (
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] ${
                                  e.rank === 1
                                    ? 'bg-yellow-500 text-white'
                                    : e.rank === 2
                                    ? 'bg-gray-300 text-gray-900'
                                    : 'bg-amber-700 text-amber-50'
                                }`}
                              >
                                {e.rank}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                #{e.rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex flex-col">
                            <span>
                              {e.you ? 'You' : e.name}{' '}
                              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                {e.country}
                              </span>
                            </span>
                            {e.you && (
                              <span className="text-[0.7rem] text-indigo-600 dark:text-indigo-300">
                                Your current position
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {e.xp.toLocaleString()} XP
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {e.band?.toFixed(1) ?? '—'}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {e.attempts}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="inline-flex items-center gap-1">
                            <Icon
                              name="flame"
                              className="h-3.5 w-3.5 text-amber-500"
                            />
                            {e.streakDays} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Side panel: your snapshot + filters */}
            <div className="space-y-4">
              <Card className="p-5">
                <p className="text-sm font-medium">Your snapshot</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  How you currently rank on this leaderboard.
                </p>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs shadow-sm dark:border-gray-800 dark:bg-black/40">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Global rank
                    </p>
                    <p className="mt-1 text-lg font-semibold">#{17}</p>
                    <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                      Approx. top 10–15% this month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.7rem] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Current band
                    </p>
                    <p className="mt-1 text-lg font-semibold">7.0</p>
                    <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                      Reading-heavy performance
                    </p>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full"
                  size="sm"
                  onClick={() => track('leaderboard_cta_start_mock')}
                >
                  Climb the board
                  <Icon name="arrow-right" className="ml-1 h-4 w-4" />
                </Button>
              </Card>

              <Card className="p-5 text-xs">
                <p className="text-sm font-medium">Filters</p>
                <p className="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">
                  Placeholder filters – wire to query params / Supabase later.
                </p>

                <div className="mt-3 space-y-3">
                  <div>
                    <p className="mb-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Region
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Global', 'Pakistan', 'South Asia', 'Custom group'].map(
                        (label) => (
                          <button
                            key={label}
                            type="button"
                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[0.7rem] text-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:bg-black/40 dark:text-gray-200 dark:hover:border-indigo-400"
                          >
                            {label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Time window
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['All-time', 'This month', 'This week'].map((label) => (
                        <button
                          key={label}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-[0.7rem] ${
                            label === 'This month'
                              ? 'border-indigo-500 bg-indigo-500 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:bg-black/40 dark:text-gray-200 dark:hover:border-indigo-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] text-gray-500 dark:text-gray-400">
            <p>
              Leaderboards update periodically. Band scores are estimated from
              your latest graded mocks.
            </p>
            <Button
              variant="ghost"
              size="xs"
              className="inline-flex items-center gap-1"
              onClick={() => track('leaderboard_feedback')}
            >
              <Icon name="message-circle" className="h-3.5 w-3.5" />
              Give feedback on rankings
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
