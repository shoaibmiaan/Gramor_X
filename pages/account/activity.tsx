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
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useLocale } from '@/lib/locale';

type ActivityRow = Database['public']['Tables']['activity_log']['Row'];

type Props = {
  activities: ActivityRow[];
  error?: string | null;
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

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeActivity(row: ActivityRow, t: (key: string, fallback: string) => string): string {
  const { activity_type, module, meta } = row;

  const safeMeta = (meta ?? {}) as Record<string, unknown>;
  const testTitle = (safeMeta.test_title as string | undefined) ?? '';
  const band = safeMeta.band as number | undefined;

  switch (activity_type) {
    case 'mock_attempt_started':
      return testTitle
        ? t('activity.mockStartedWithTitle', 'Started mock test: {{title}}', { title: testTitle })
        : t('activity.mockStarted', 'Started a mock test');

    case 'mock_attempt_submitted':
      if (testTitle && band != null) {
        return t('activity.mockSubmittedWithBand', 'Submitted mock test "{{title}}" — Band {{band}}', {
          title: testTitle,
          band: band.toString(),
        });
      }
      if (testTitle) {
        return t('activity.mockSubmittedWithTitle', 'Submitted mock test: {{title}}', { title: testTitle });
      }
      return t('activity.mockSubmitted', 'Submitted a mock test');

    case 'practice_started':
      return t('activity.practiceStarted', 'Started a {{module}} practice session', {
        module: moduleLabel[module] ?? module,
      });

    case 'practice_completed':
      return t('activity.practiceCompleted', 'Completed a {{module}} practice session', {
        module: moduleLabel[module] ?? module,
      });

    case 'lesson_completed':
      return testTitle
        ? t('activity.lessonCompletedWithTitle', 'Completed lesson: {{title}}', { title: testTitle })
        : t('activity.lessonCompleted', 'Completed a lesson');

    case 'streak_day_recorded':
      return t('activity.streakUpdated', 'Daily streak updated');

    case 'login':
      return t('activity.login', 'Logged in');

    case 'profile_updated':
      return t('activity.profileUpdated', 'Updated profile');

    case 'plan_upgraded':
      return t('activity.planUpgraded', 'Upgraded subscription plan');

    case 'plan_downgraded':
      return t('activity.planDowngraded', 'Downgraded subscription plan');

    default:
      return activity_type.replace(/_/g, ' ');
  }
}

const ActivityPage: NextPage<Props> = ({ activities, error: serverError }) => {
  const { t, locale } = useLocale();
  const [isClient, setIsClient] = React.useState(false);
  const [expandedMeta, setExpandedMeta] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const groups = React.useMemo(() => {
    const map = new Map<string, ActivityRow[]>();

    for (const row of activities) {
      const key = formatDate(row.occurred_at, locale);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    return Array.from(map.entries());
  }, [activities, locale]);

  const toggleMeta = (id: string) => {
    setExpandedMeta((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!isClient) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Container className="py-10 space-y-8 max-w-5xl">
          <Skeleton className="h-12 w-64 rounded-ds-xl" />
          <Skeleton className="h-24 w-full rounded-ds-2xl" />
          <Skeleton className="h-96 w-full rounded-ds-2xl" />
        </Container>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{t('activity.pageTitle', 'Activity Log · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'activity.pageDescription',
            'See everything you’ve been doing inside GramorX in one unified timeline.'
          )}
        />
      </Head>

      <main className="min-h-screen bg-background text-foreground">
        <Container className="py-10 space-y-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-h2 font-semibold tracking-tight">
                {t('activity.title', 'Activity log')}
              </h1>
              <p className="mt-1 max-w-xl text-small text-muted-foreground">
                {t(
                  'activity.subtitle',
                  'A unified timeline of your mocks, practice, lessons, and streak updates – only visible to you (and admins for support).'
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="border border-border/60"
                disabled
                aria-disabled="true"
              >
                <Icon name="filter" className="mr-2 h-4 w-4" />
                {t('activity.filters', 'Filters')} ({t('common.comingSoon', 'coming soon')})
              </Button>
              <Button variant="outline" size="sm" disabled aria-disabled="true">
                <Icon name="download" className="mr-2 h-4 w-4" />
                {t('activity.export', 'Export')}
              </Button>
            </div>
          </div>

          {/* Server error alert */}
          {serverError && (
            <Alert variant="error" appearance="soft" title={t('common.error', 'Error')} role="alert">
              <p className="mt-2 text-small text-muted-foreground">{serverError}</p>
            </Alert>
          )}

          {/* Summary strip */}
          <Card className="border border-border/60 bg-muted/40">
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-small">
              <div className="flex items-center gap-2">
                <Icon name="history" className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {activities.length > 0
                    ? t('activity.summary.count', '{{count}} activities tracked', { count: activities.length })
                    : t('activity.summary.empty', 'No activity recorded yet')}
                </span>
              </div>
              <div className="h-4 w-px bg-border/60" />
              <p className="text-muted-foreground">
                {t(
                  'activity.summary.privacy',
                  'This log is personal to you. Only you and admins (for support) can see it.'
                )}
              </p>
            </div>
          </Card>

          {/* Timeline */}
          {activities.length === 0 ? (
            <Card className="py-10 text-center">
              <Icon name="inbox" className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{t('activity.empty.title', 'No activity yet')}</p>
              <p className="mt-1 text-small text-muted-foreground">
                {t(
                  'activity.empty.description',
                  'Start a mock test or practice session and your timeline will show up here.'
                )}
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
                        const iconName = moduleIcon[row.module] ?? 'activity';
                        const hasMeta = row.meta && Object.keys(row.meta).length > 0;
                        const isExpanded = expandedMeta.has(row.id);

                        return (
                          <li
                            key={row.id}
                            className="flex items-start gap-4 px-4 py-3"
                          >
                            {/* Left: icon + vertical line */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon name={iconName} className="h-4 w-4" />
                              </div>
                              <div className="mt-1 h-full w-px flex-1 bg-border/40" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-small font-medium">
                                  {describeActivity(row, t)}
                                </p>
                                <Badge size="sm" variant="soft">
                                  {label}
                                </Badge>
                              </div>

                              <p className="text-[11px] text-muted-foreground">
                                {formatTime(row.occurred_at, locale)} ·{' '}
                                <span className="font-mono text-[11px] uppercase">
                                  {row.activity_type}
                                </span>
                              </p>

                              {hasMeta && (
                                <div className="mt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-0 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                                    onClick={() => toggleMeta(row.id)}
                                    aria-expanded={isExpanded}
                                  >
                                    <Icon
                                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                      className="mr-1 h-3 w-3"
                                    />
                                    {isExpanded
                                      ? t('activity.meta.hide', 'Hide details')
                                      : t('activity.meta.show', 'Show details')}
                                  </Button>

                                  {isExpanded && (
                                    <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                                      <span className="font-medium">
                                        {t('activity.meta.extra', 'Extra details:')}
                                      </span>{' '}
                                      <code className="font-mono text-[11px] break-all">
                                        {JSON.stringify(row.meta)}
                                      </code>
                                    </div>
                                  )}
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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent('/account/activity')}`,
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
    return {
      props: {
        activities: [],
        error: 'Failed to load activity log. Please try again later.',
      },
    };
  }

  return {
    props: {
      activities: data ?? [],
      error: null,
    },
  };
};

export default ActivityPage;