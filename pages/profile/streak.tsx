import type { GetServerSideProps, NextPage } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { StreakChip } from '@/components/user/StreakChip';
import { getServerClient } from '@/lib/supabaseServer';
import { buildCompletionHistory } from '@/utils/streak';

const Heatmap = dynamic(
  () => import('@/components/user/StreakHeatmap').then((mod) => mod.StreakHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-ds-2xl border border-dashed border-border bg-muted" />
    ),
  },
);

type HistoryEntry = { date: string; completed: number; total: number };

type Props = {
  streak: {
    current: number;
    longest: number;
    lastActive: string | null;
  };
  history: HistoryEntry[];
};

const formatDisplayDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
};

const StreakPage: NextPage<Props> = ({ streak, history }) => {
  return (
    <section className="bg-background text-foreground py-16">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-slab text-display">Your streak</h1>
            <p className="text-body text-muted-foreground">
              Keep learning every day—complete a study task before midnight Pakistan time to maintain the streak.
            </p>
          </div>
          <StreakChip value={streak.current} href="/profile/streak" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="rounded-ds-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-slab text-h3">Calendar heatmap</h2>
                <p className="text-small text-muted-foreground">
                  Each square represents a day. Darker shades mean more tasks completed.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">PKT timezone</span>
            </div>
            <div className="mt-6">
              <Heatmap data={history} />
            </div>
          </Card>

          <Card className="rounded-ds-2xl p-6 space-y-4">
            <h2 className="font-slab text-h4">Summary</h2>
            <dl className="space-y-3 text-small">
              <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                <dt className="text-muted-foreground">Current streak</dt>
                <dd className="font-semibold">{streak.current} days</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                <dt className="text-muted-foreground">Longest streak</dt>
                <dd className="font-semibold">{streak.longest} days</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                <dt className="text-muted-foreground">Last activity</dt>
                <dd className="font-semibold">{formatDisplayDate(streak.lastActive)}</dd>
              </div>
            </dl>
            <div className="rounded-xl bg-muted/60 px-4 py-3 text-small text-muted-foreground">
              <h3 className="font-semibold text-foreground">How your streak works</h3>
              <ul className="mt-2 list-disc space-y-2 pl-4">
                <li>Complete at least one scheduled study task before midnight Pakistan time (PKT) each day.</li>
                <li>Every productive day extends your streak and fills the heatmap for that date.</li>
                <li>Missing a day resets your current streak, but your longest streak stays recorded for motivation.</li>
              </ul>
            </div>
            <div className="pt-4">
              <Button variant="primary" fullWidth asChild>
                <Link href="/study-plan">Go to study plan</Link>
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const DAYS_BACK = 84;

  const [streakRes, historyRes] = await Promise.all([
    supabase
      .from('streaks')
      .select('current,longest,last_active_date')
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
    },
  };
};

export default StreakPage;
