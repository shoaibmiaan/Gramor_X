import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/lib/database.types';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type ActivityRow = Database['public']['Tables']['activity_log']['Row'];

type Props = {
  activities: ActivityRow[];
};

const moduleLabel: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  vocab: 'Vocabulary',
  mock: 'Mock Tests',
  system: 'System',
};

const moduleIcon: Record<string, string> = {
  listening: 'headphones',
  reading: 'book-open',
  writing: 'pen-square',
  speaking: 'mic',
  vocab: 'sparkles',
  mock: 'timer',
  system: 'activity',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeActivity(row: ActivityRow): string {
  const { activity_type, module, meta } = row;

  const safeMeta = (meta ?? {}) as Record<string, unknown>;
  const testTitle = (safeMeta.test_title as string | undefined) ?? '';
  const band = safeMeta.band as number | undefined;

  switch (activity_type) {
    case 'mock_attempt_started':
      return testTitle
        ? `Started mock test: ${testTitle}`
        : 'Started a mock test';

    case 'mock_attempt_submitted':
      if (testTitle && band != null) {
        return `Submitted mock test "${testTitle}" — Band ${band}`;
      }
      if (testTitle) return `Submitted mock test: ${testTitle}`;
      return 'Submitted a mock test';

    case 'practice_started':
      return `Started a ${moduleLabel[module] ?? module} practice session`;

    case 'practice_completed':
      return `Completed a ${moduleLabel[module] ?? module} practice session`;

    case 'lesson_completed':
      return testTitle
        ? `Completed lesson: ${testTitle}`
        : 'Completed a lesson';

    case 'streak_day_recorded':
      return 'Daily streak updated';

    case 'login':
      return 'Logged in';

    case 'profile_updated':
      return 'Updated profile';

    case 'plan_upgraded':
      return 'Upgraded subscription plan';

    case 'plan_downgraded':
      return 'Downgraded subscription plan';

    default:
      return activity_type.replace(/_/g, ' ');
  }
}

const ActivityPage: NextPage<Props> = ({ activities }) => {
  const groups = React.useMemo(() => {
    const map = new Map<string, ActivityRow[]>();

    for (const row of activities) {
      const key = formatDate(row.occurred_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    return Array.from(map.entries());
  }, [activities]);

  return (
    <>
      <Head>
        <title>Activity Log · GramorX</title>
        <meta
          name="description"
          content="See everything you’ve been doing inside GramorX in one unified timeline."
        />
      </Head>

      <main className="min-h-screen bg-background text-foreground">
        <Container className="py-10 space-y-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-h2 font-semibold tracking-tight">
                Activity log
              </h1>
              <p className="mt-1 max-w-xl text-small text-muted-foreground">
                A unified timeline of your mocks, practice, lessons, and streak
                updates – only visible to you (and admins for support).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="border border-border/60"
              >
                <Icon name="filter" className="mr-2 h-4 w-4" />
                Filters (coming soon)
              </Button>
              <Button variant="outline" size="sm">
                <Icon name="download" className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Summary strip */}
          <Card className="border border-border/60 bg-muted/40">
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-small">
              <div className="flex items-center gap-2">
                <Icon
                  name="history"
                  className="h-4 w-4 text-muted-foreground"
                />
                <span className="font-medium">
                  {activities.length > 0
                    ? `${activities.length} activities tracked`
                    : 'No activity recorded yet'}
                </span>
              </div>
              <div className="h-4 w-px bg-border/60" />
              <p className="text-muted-foreground">
                This log is personal to you. Only you and admins (for support)
                can see it.
              </p>
            </div>
          </Card>

          {/* Timeline */}
          {activities.length === 0 ? (
            <Card className="py-10 text-center">
              <Icon
                name="inbox"
                className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
              />
              <p className="font-medium">No activity yet</p>
              <p className="mt-1 text-small text-muted-foreground">
                Start a mock test or practice session and your timeline will
                show up here.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {groups.map(([dateLabel, rows]) => (
                <section key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/60" />
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {dateLabel}
                    </div>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>

                  <Card className="border border-border/60 bg-background/80">
                    <ul className="divide-y divide-border/60">
                      {rows.map((row) => {
                        const label = moduleLabel[row.module] ?? row.module;
                        const iconName =
                          moduleIcon[row.module] ?? 'activity';

                        return (
                          <li
                            key={row.id}
                            className="flex items-start gap-4 px-4 py-3"
                          >
                            {/* Left: icon + vertical line */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon
                                  name={iconName}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="mt-1 h-full w-px flex-1 bg-border/40" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-small font-medium">
                                  {describeActivity(row)}
                                </p>
                                <Badge size="sm" variant="soft">
                                  {label}
                                </Badge>
                              </div>

                              <p className="text-[11px] text-muted-foreground">
                                {formatTime(row.occurred_at)} ·{' '}
                                <span className="font-mono text-[11px] uppercase">
                                  {row.activity_type}
                                </span>
                              </p>

                              {row.meta &&
                                Object.keys(row.meta).length > 0 && (
                                  <div className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                                    <span className="font-medium">
                                      Extra details:
                                    </span>{' '}
                                    <code className="font-mono text-[11px]">
                                      {JSON.stringify(row.meta)}
                                    </code>
                                  </div>
                                )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </section>
              ))}
            </div>
          )}
        </Container>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/auth/login?next=/account/activity',
        permanent: false,
      },
    };
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(200);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[activity_log] fetch failed', error);
  }

  return {
    props: {
      activities: data ?? [],
    },
  };
};

export default ActivityPage;
