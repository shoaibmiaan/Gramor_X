// pages/profile/streak.tsx
import type { GetServerSideProps, NextPage } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { StreakChip } from '@/components/user/StreakChip';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { getServerClient } from '@/lib/supabaseServer';
import { getStreakCalendar, getUserStreak } from '@/lib/streak';
import { useLocale } from '@/lib/locale';

const Heatmap = dynamic(
  () => import('@/components/user/StreakHeatmap').then((mod) => mod.StreakHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-ds-2xl border border-dashed border-border bg-muted" />
    ),
  }
);

type HistoryEntry = { date: string; completed: number; total: number };
type TodayTask = { key: string; label: string; href: string; completed: boolean };
type ActivityEntry = { date: string; tasks: string[] };

type Props = {
  streak: {
    current: number;
    longest: number;
    lastActive: string | null;
  };
  history: HistoryEntry[];
  todayTasks: TodayTask[];
  activityHistory: ActivityEntry[];
  error?: string | null;
};

const formatDisplayDate = (iso: string | null, locale: string) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
};

const StreakPage: NextPage<Props> = ({ streak, history, todayTasks, activityHistory, error }) => {
  const { t, locale } = useLocale();

  if (error) {
    return (
      <section className="bg-background text-foreground py-16">
        <Container>
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        </Container>
      </section>
    );
  }

  return (
    <>
      <Head>
        <title>{t('streak.pageTitle', 'Your Streak · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'streak.pageDescription',
            'Track your daily learning streak and see your progress over time.'
          )}
        />
      </Head>

      <section className="bg-background text-foreground py-16">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-h2 font-bold">{t('streak.title', 'Your streak')}</h1>
              <p className="text-body text-muted-foreground">
                {t(
                  'streak.subtitle',
                  'Keep learning every day—complete a study task before midnight Pakistan time to maintain the streak.'
                )}
              </p>
            </div>
            <StreakChip value={streak.current} href="/profile/streak" />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="rounded-ds-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-h4 font-semibold">
                    {t('streak.heatmap.title', 'Calendar heatmap')}
                  </h2>
                  <p className="text-small text-muted-foreground">
                    {t(
                      'streak.heatmap.description',
                      'Each square represents a day. Darker shades mean more tasks completed.'
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t('streak.heatmap.timezone', 'PKT timezone')}
                </span>
              </div>
              <div className="mt-6">
                <Heatmap data={history} />
              </div>
            </Card>

            <Card className="rounded-ds-2xl p-6 space-y-4">
              <h2 className="text-h4 font-semibold">{t('streak.summary', 'Summary')}</h2>
              <dl className="space-y-3 text-small">
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <dt className="text-muted-foreground">
                    {t('streak.current', 'Current streak')}
                  </dt>
                  <dd className="font-semibold">
                    {t('streak.days', '{{count}} days', { count: streak.current })}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <dt className="text-muted-foreground">
                    {t('streak.longest', 'Longest streak')}
                  </dt>
                  <dd className="font-semibold">
                    {t('streak.days', '{{count}} days', { count: streak.longest })}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <dt className="text-muted-foreground">
                    {t('streak.lastActive', 'Last activity')}
                  </dt>
                  <dd className="font-semibold">
                    {formatDisplayDate(streak.lastActive, locale)}
                  </dd>
                </div>
              </dl>



              <div className="rounded-xl border border-border/70 p-4">
                <h3 className="font-semibold text-foreground">Today's streak tasks</h3>
                <p className="mt-1 text-xs text-muted-foreground">Complete any one of these tasks to keep today's streak active.</p>
                <ul className="mt-3 space-y-2">
                  {todayTasks.map((task) => (
                    <li key={task.key} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                      <span>{task.label}</span>
                      {task.completed ? (
                        <span className="font-semibold text-green-700">Done</span>
                      ) : (
                        <Link href={task.href} className="font-semibold text-electricBlue hover:underline">
                          Start
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border/70 p-4">
                <h3 className="font-semibold text-foreground">Streak activity history</h3>
                <ul className="mt-3 space-y-2">
                  {activityHistory.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No recent completed streak tasks yet.</li>
                  ) : (
                    activityHistory.slice().reverse().slice(0, 10).map((entry) => (
                      <li key={entry.date} className="rounded-lg bg-muted px-3 py-2 text-sm">
                        <span className="font-semibold">{entry.date}</span>
                        <span className="ml-2 text-muted-foreground">{entry.tasks.join(', ')}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-xl bg-muted/60 px-4 py-3 text-small text-muted-foreground">
                <h3 className="font-semibold text-foreground">
                  {t('streak.howItWorks.title', 'How your streak works')}
                </h3>
                <ul className="mt-2 list-disc space-y-2 pl-4">
                  <li>
                    {t(
                      'streak.howItWorks.point1',
                      'Complete at least one scheduled study task before midnight Pakistan time (PKT) each day.'
                    )}
                  </li>
                  <li>
                    {t(
                      'streak.howItWorks.point2',
                      'Every productive day extends your streak and fills the heatmap for that date.'
                    )}
                  </li>
                  <li>
                    {t(
                      'streak.howItWorks.point3',
                      'Missing a day resets your current streak, but your longest streak stays recorded for motivation.'
                    )}
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <Button variant="primary" fullWidth asChild>
                  <Link href="/study-plan">
                    {t('streak.goToStudyPlan', 'Go to study plan')}
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const DAYS_BACK = 84;

  try {
    const [streakSummary, calendar] = await Promise.all([
      getUserStreak(supabase, user.id),
      getStreakCalendar(supabase, user.id, DAYS_BACK),
    ]);

    const history = calendar.map((entry) => ({
      date: entry.date,
      completed: entry.active ? 1 : 0,
      total: 1,
    }));

    return {
      props: {
        streak: {
          current: streakSummary.current_streak,
          longest: streakSummary.longest_streak,
          lastActive: streakSummary.last_activity_date,
        },
        history,
        todayTasks: streakSummary.today_tasks,
        activityHistory: streakSummary.activity_history,
        error: null,
      },
    };
  } catch (err) {
    console.error('[profile/streak] Unexpected error:', err);
    return {
      props: {
        streak: { current: 0, longest: 0, lastActive: null },
        history: [],
        todayTasks: [],
        activityHistory: [],
        error: 'Failed to load streak data. Please try again later.',
      },
    };
  }
};

export default StreakPage;