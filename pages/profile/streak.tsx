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
import { buildCompletionHistory } from '@/utils/streak';
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

type Props = {
  streak: {
    current: number;
    longest: number;
    lastActive: string | null;
  };
  history: HistoryEntry[];
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

const StreakPage: NextPage<Props> = ({ streak, history, error }) => {
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
    const [streakRes, historyRes] = await Promise.all([
      supabase
        .from('streaks')
        .select('current, longest, last_active_date')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.rpc('get_streak_history', {
        p_user_id: user.id,
        p_days_back: DAYS_BACK,
      }),
    ]);

    const streakRow = streakRes.data ?? null;
    const rawHistory = historyRes.data ?? [];

    if (streakRes.error) {
      console.error('[profile/streak] Unable to load streak row:', streakRes.error.message);
    }
    if (historyRes.error) {
      console.error('[profile/streak] Unable to load history:', historyRes.error.message);
    }

    const history = buildCompletionHistory(rawHistory, DAYS_BACK);

    return {
      props: {
        streak: {
          current: streakRow?.current ?? 0,
          longest: streakRow?.longest ?? streakRow?.current ?? 0,
          lastActive: streakRow?.last_active_date ?? null,
        },
        history,
        error: null,
      },
    };
  } catch (err) {
    console.error('[profile/streak] Unexpected error:', err);
    return {
      props: {
        streak: { current: 0, longest: 0, lastActive: null },
        history: [],
        error: 'Failed to load streak data. Please try again later.',
      },
    };
  }
};

export default StreakPage;