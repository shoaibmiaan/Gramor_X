// pages/mock/dashboard.tsx

import * as React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';

import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

type DashboardAttempt = {
  id: string;
  module: 'listening' | 'reading' | 'writing' | 'speaking';
  mode: string | null;
  status: string | null;
  startedAt: string;
  submittedAt: string | null;
  bandScore: number | null;
  rawScore: number | null;
  questionCount: number | null;
  durationSeconds: number | null;
};

type Bands = {
  overall: number | null;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
};

type ProfileSummary = {
  fullName: string | null;
  targetBand: number | null;
  nextExamDate: string | null;
  streakDays: number;
};

type PageProps = {
  profile: ProfileSummary;
  bands: Bands;
  recentAttempts: DashboardAttempt[];
  weakAreas: string[];
  aiInsights: string[];
};

const MockDashboardPage: NextPage<PageProps> = ({
  profile,
  bands,
  recentAttempts,
  weakAreas,
  aiInsights,
}) => {
  const hasAttempts = recentAttempts.length > 0;

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '-';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  };

  const bandDisplay = (value: number | null) =>
    value == null ? '—' : value.toFixed(1);

  const streakLabel =
    profile.streakDays > 0 ? `${profile.streakDays} day streak` : 'No streak yet';

  return (
    <Container className="py-8 space-y-8">
      {/* HERO / TOP STRIP */}
      <section className="grid gap-4 md:grid-cols-[2fr,1.2fr] items-stretch">
        <Card className="relative overflow-hidden border border-slate-800 bg-gradient-to-r from-indigo-950 via-slate-950 to-slate-900 text-slate-50">
          <div className="absolute inset-y-0 right-0 w-40 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top,_#4f46e5_0,_transparent_60%)]" />
          <div className="relative flex flex-col h-full justify-between">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Mock Mission Control
                </p>
                <h1 className="text-xl md:text-2xl font-semibold">
                  Hey{profile.fullName ? `, ${profile.fullName}` : ''} — let&apos;s
                  chase that band {profile.targetBand ?? 7}.0
                </h1>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {streakLabel}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm">
              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                <p className="text-slate-400 mb-1">Target band</p>
                <p className="text-lg font-semibold">
                  {profile.targetBand ? profile.targetBand.toFixed(1) : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                <p className="text-slate-400 mb-1">Current estimate</p>
                <p className="text-lg font-semibold">
                  {bandDisplay(bands.overall)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                <p className="text-slate-400 mb-1">Next exam</p>
                <p className="text-sm font-medium">
                  {formatDate(profile.nextExamDate)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                <p className="text-slate-400 mb-1">Weak modules</p>
                <p className="text-xs font-medium">
                  {weakAreas.length === 0 ? 'None flagged yet' : weakAreas.join(', ')}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/mock">
                <Button size="sm" className="text-xs md:text-sm">
                  Start new mock
                </Button>
              </Link>
              <Link href="/mock/reading">
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs md:text-sm"
                >
                  Reading practice
                </Button>
              </Link>
              <Link href="/mock/listening">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs md:text-sm text-slate-300"
                >
                  Listening practice
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* QUICK SUMMARY CARD */}
        <Card className="flex flex-col justify-between border-slate-800 bg-slate-950/80">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
              Quick summary
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <SummaryPill
                label="Listening"
                band={bands.listening}
                intent={
                  bands.listening && profile.targetBand && bands.listening < profile.targetBand
                    ? 'warning'
                    : 'ok'
                }
              />
              <SummaryPill
                label="Reading"
                band={bands.reading}
                intent={
                  bands.reading && profile.targetBand && bands.reading < profile.targetBand
                    ? 'warning'
                    : 'ok'
                }
              />
              <SummaryPill
                label="Writing"
                band={bands.writing}
                intent={
                  bands.writing && profile.targetBand && bands.writing < profile.targetBand
                    ? 'warning'
                    : 'ok'
                }
              />
              <SummaryPill
                label="Speaking"
                band={bands.speaking}
                intent={
                  bands.speaking && profile.targetBand && bands.speaking < profile.targetBand
                    ? 'warning'
                    : 'ok'
                }
              />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            This is an **estimate** based on your recent mocks. More mocks = sharper
            predictions.
          </div>
        </Card>
      </section>

      {/* ACTIONS + FAKE CHART */}
      <section className="grid gap-4 lg:grid-cols-[1.8fr,1.2fr] items-start">
        <Card className="border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Performance trend (last 10 mocks)
            </h2>
            <span className="text-[11px] text-slate-400">
              This is a simple visual — wire real charts later.
            </span>
          </div>

          <div className="mt-4">
            {hasAttempts ? (
              <FakeBandTimeline attempts={recentAttempts} />
            ) : (
              <p className="text-xs text-slate-400">
                No mocks yet. Start your first full mock to unlock trends.
              </p>
            )}
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-950/80">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            AI insights (GX Brain style)
          </h2>
          {aiInsights.length === 0 ? (
            <p className="text-xs text-slate-400">
              Once you complete a couple of mocks, we&apos;ll start dropping specific,
              brutal honesty about your weak spots here.
            </p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-200">
              {aiInsights.map((insight, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                >
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* TABLE + RECOMMENDED */}
      <section className="grid gap-4 xl:grid-cols-[2fr,1.1fr] items-start">
        <Card className="border-slate-800 bg-slate-950/80 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Recent mock attempts
            </h2>
            <Link href="/mock/history">
              <Button variant="ghost" size="xs" className="text-[11px]">
                View all
              </Button>
            </Link>
          </div>

          {hasAttempts ? (
            <table className="w-full text-xs md:text-sm border-separate border-spacing-y-1">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="text-left font-medium px-2 py-1">Test</th>
                  <th className="text-left font-medium px-2 py-1">Module</th>
                  <th className="text-left font-medium px-2 py-1">Band</th>
                  <th className="text-left font-medium px-2 py-1">Raw</th>
                  <th className="text-left font-medium px-2 py-1">Duration</th>
                  <th className="text-left font-medium px-2 py-1">Date</th>
                  <th className="text-left font-medium px-2 py-1">Status</th>
                  <th className="text-left font-medium px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    className="bg-slate-900/60 hover:bg-slate-900 transition-colors rounded-lg"
                  >
                    <td className="px-2 py-1 align-middle text-slate-200">
                      #{attempt.id.slice(0, 6).toUpperCase()}
                    </td>
                    <td className="px-2 py-1 align-middle">
                      <Badge
                        className={
                          attempt.module === 'listening'
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/40'
                            : attempt.module === 'reading'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40'
                        }
                      >
                        {attempt.module}
                      </Badge>
                    </td>
                    <td className="px-2 py-1 align-middle text-slate-100">
                      {bandDisplay(attempt.bandScore)}
                    </td>
                    <td className="px-2 py-1 align-middle text-slate-200">
                      {attempt.rawScore ?? '—'}
                    </td>
                    <td className="px-2 py-1 align-middle text-slate-200">
                      {formatDuration(attempt.durationSeconds)}
                    </td>
                    <td className="px-2 py-1 align-middle text-slate-200">
                      {formatDate(attempt.startedAt)}
                    </td>
                    <td className="px-2 py-1 align-middle text-slate-200">
                      {attempt.status ?? (attempt.submittedAt ? 'submitted' : 'in_progress')}
                    </td>
                    <td className="px-2 py-1 align-middle">
                      <Link href={`/mock/result/${attempt.id}`}>
                        <Button variant="ghost" size="xs" className="text-[11px]">
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400">
              No mock attempts yet. Start a full mock to see your history here.
            </p>
          )}
        </Card>

        <Card className="border-slate-800 bg-slate-950/80">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Recommended next steps
          </h2>
          {weakAreas.length === 0 ? (
            <p className="text-xs text-slate-400">
              Once we have more mocks from you, we&apos;ll start recommending specific
              tests and practice flows based on your weak modules and question types.
            </p>
          ) : (
            <ul className="space-y-3 text-xs text-slate-200">
              {weakAreas.includes('Reading') && (
                <li className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <p className="font-semibold mb-1">Boost your Reading score</p>
                  <p className="text-slate-300 mb-2">
                    Your reading band is currently below your target. Focus on timing and
                    high-volume passages.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/mock/reading">
                      <Button size="xs">Start Reading mock</Button>
                    </Link>
                    <Link href="/reading/practice">
                      <Button size="xs" variant="secondary">
                        Practice weak question types
                      </Button>
                    </Link>
                  </div>
                </li>
              )}
              {weakAreas.includes('Listening') && (
                <li className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <p className="font-semibold mb-1">Tighten your Listening</p>
                  <p className="text-slate-300 mb-2">
                    You&apos;re losing marks in Listening — especially in later parts when
                    fatigue kicks in.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/mock/listening">
                      <Button size="xs">Start Listening mock</Button>
                    </Link>
                    <Link href="/listening/practice">
                      <Button size="xs" variant="secondary">
                        Short listening drills
                      </Button>
                    </Link>
                  </div>
                </li>
              )}
              {/* You can add Writing/Speaking recommendations similarly later */}
            </ul>
          )}
        </Card>
      </section>
    </Container>
  );
};

type SummaryPillProps = {
  label: string;
  band: number | null;
  intent?: 'ok' | 'warning';
};

const SummaryPill: React.FC<SummaryPillProps> = ({ label, band, intent = 'ok' }) => {
  const isWarning = intent === 'warning';

  return (
    <div
      className={[
        'rounded-lg border px-3 py-2 flex flex-col gap-1',
        isWarning
          ? 'border-amber-500/40 bg-amber-500/5 text-amber-100'
          : 'border-slate-700 bg-slate-900/80 text-slate-100',
      ].join(' ')}
    >
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-lg font-semibold leading-none">
        {band == null ? '—' : band.toFixed(1)}
      </p>
      {isWarning && (
        <p className="text-[11px] text-amber-200">
          Below target — needs focused work.
        </p>
      )}
    </div>
  );
};

type FakeBandTimelineProps = {
  attempts: DashboardAttempt[];
};

const FakeBandTimeline: React.FC<FakeBandTimelineProps> = ({ attempts }) => {
  if (attempts.length === 0) return null;

  // Normalize band scores into a 0–100 range for bar height
  const points = attempts
    .map((a) => (a.bandScore == null ? null : a.bandScore))
    .filter((v): v is number => v != null);

  if (points.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        We don&apos;t have band scores recorded yet. Once mocks start saving bands,
        we&apos;ll visualize them here.
      </p>
    );
  }

  const maxBand = Math.max(...points, 9);
  const minBand = Math.min(...points, 4);
  const range = maxBand - minBand || 1;

  return (
    <div className="flex items-end gap-1 h-32">
      {attempts.slice(0, 10).map((attempt, index) => {
        const band = attempt.bandScore;
        const normalized =
          band == null ? 0.1 : 0.1 + 0.9 * ((band - minBand) / range);
        const heightPercent = Math.round(normalized * 100);

        const colorClass =
          attempt.module === 'listening'
            ? 'bg-sky-500/80'
            : attempt.module === 'reading'
            ? 'bg-emerald-500/80'
            : 'bg-indigo-500/80';

        return (
          <div
            key={attempt.id}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={`w-full rounded-t-md ${colorClass}`}
              style={{ height: `${heightPercent}%` }}
              title={`Band ${band?.toFixed(1) ?? '—'}`}
            />
            <span className="text-[10px] text-slate-400">
              {attempt.module[0].toUpperCase()}
              {index + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient<Database>(ctx);

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: `/auth/login?next=/mock/dashboard`,
        permanent: false,
      },
    };
  }

  // PROFILE
  let fullName: string | null = null;
  let targetBand: number | null = null;
  let nextExamDate: string | null = null;
  let streakDays = 0;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, target_band, next_exam_date, streak_days')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      fullName = (profile as any).full_name ?? null;
      targetBand =
        (profile as any).target_band != null
          ? Number((profile as any).target_band)
          : null;
      nextExamDate = (profile as any).next_exam_date ?? null;
      streakDays =
        (profile as any).streak_days != null
          ? Number((profile as any).streak_days)
          : 0;
    }
  } catch {
    // swallow — use defaults
  }

  // ATTEMPTS
  const recentAttempts: DashboardAttempt[] = [];

  // LISTENING ATTEMPTS (if table exists)
  try {
    const { data: listening } = await supabase
      .from('listening_attempts')
      .select(
        'id, mode, status, started_at, submitted_at, duration_seconds, raw_score, band_score, question_count',
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (listening) {
      listening.forEach((row: any) => {
        recentAttempts.push({
          id: row.id,
          module: 'listening',
          mode: row.mode ?? null,
          status: row.status ?? null,
          startedAt: row.started_at,
          submittedAt: row.submitted_at,
          durationSeconds:
            row.duration_seconds != null
              ? Number(row.duration_seconds)
              : null,
          rawScore: row.raw_score != null ? Number(row.raw_score) : null,
          bandScore: row.band_score != null ? Number(row.band_score) : null,
          questionCount:
            row.question_count != null ? Number(row.question_count) : null,
        });
      });
    }
  } catch {
    // ignore if table not ready
  }

  // READING ATTEMPTS
  try {
    const { data: reading } = await supabase
      .from('reading_attempts')
      .select(
        'id, mode, status, started_at, submitted_at, duration_seconds, raw_score, band_score, question_count',
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (reading) {
      reading.forEach((row: any) => {
        recentAttempts.push({
          id: row.id,
          module: 'reading',
          mode: row.mode ?? null,
          status: row.status ?? null,
          startedAt: row.started_at,
          submittedAt: row.submitted_at,
          durationSeconds:
            row.duration_seconds != null
              ? Number(row.duration_seconds)
              : null,
          rawScore: row.raw_score != null ? Number(row.raw_score) : null,
          bandScore: row.band_score != null ? Number(row.band_score) : null,
          questionCount:
            row.question_count != null ? Number(row.question_count) : null,
        });
      });
    }
  } catch {
    // ignore if table not ready
  }

  // TODO: once writing/speaking attempts tables exist, add them similarly.

  // SORT BY DATE DESC (across modules)
  recentAttempts.sort((a, b) => {
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  const bands: Bands = {
    overall: null,
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
  };

  // Compute simple averages
  const safeNumber = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const listeningBands = recentAttempts
    .filter((a) => a.module === 'listening')
    .map((a) => safeNumber(a.bandScore))
    .filter((v): v is number => v != null);

  const readingBands = recentAttempts
    .filter((a) => a.module === 'reading')
    .map((a) => safeNumber(a.bandScore))
    .filter((v): v is number => v != null);

  if (listeningBands.length > 0) {
    bands.listening =
      listeningBands.reduce((sum, v) => sum + v, 0) / listeningBands.length;
  }

  if (readingBands.length > 0) {
    bands.reading =
      readingBands.reduce((sum, v) => sum + v, 0) / readingBands.length;
  }

  const allBands = [...listeningBands, ...readingBands];
  if (allBands.length > 0) {
    bands.overall =
      allBands.reduce((sum, v) => sum + v, 0) / allBands.length;
  }

  // Weak areas
  const weakAreas: string[] = [];
  const tgt = targetBand ?? 7;

  if (bands.reading != null && bands.reading < tgt) {
    weakAreas.push('Reading');
  }
  if (bands.listening != null && bands.listening < tgt) {
    weakAreas.push('Listening');
  }

  // AI-ish insights (rule based for now)
  const aiInsights: string[] = [];

  if (bands.overall != null && targetBand != null) {
    const diff = targetBand - bands.overall;
    if (diff > 1.0) {
      aiInsights.push(
        `You're currently around band ${bands.overall.toFixed(
          1,
        )}, which is more than 1 band below your target ${targetBand.toFixed(
          1,
        )}. You need consistent full mocks, not just casual practice.`,
      );
    } else if (diff > 0.3) {
      aiInsights.push(
        `You're within striking distance of your target. Tighten up timing and work on weak question types to close the final gap.`,
      );
    } else if (diff <= 0.3) {
      aiInsights.push(
        `You're basically at or above your target band. Now it's about stability — keep mocks regular so exam day feels like repetition.`,
      );
    }
  }

  if (weakAreas.includes('Reading')) {
    aiInsights.push(
      `Reading is dragging your overall band. Focus on TF/NG/Y/NG and long passages — you likely lose marks in the last 10 questions.`,
    );
  }

  if (weakAreas.includes('Listening')) {
    aiInsights.push(
      `Listening scores are below target. You probably lose focus in Part 3 & 4. Start doing short, high-intensity practice sets for those parts.`,
    );
  }

  const profile: ProfileSummary = {
    fullName,
    targetBand,
    nextExamDate,
    streakDays,
  };

  return {
    props: {
      profile,
      bands,
      recentAttempts: recentAttempts.slice(0, 10),
      weakAreas,
      aiInsights,
    },
  };
};

export default MockDashboardPage;
