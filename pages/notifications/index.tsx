import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';
import {
  NotificationListResponseSchema,
  type NotificationNudge,
} from '@/lib/schemas/notifications';

const notificationsCanonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/notifications`
  : undefined;
const notificationsEnabled = flags.enabled('notifications');
const PAGE_SIZE = 20;

function NotificationsComingSoon() {
  return (
    <>
      <Head>
        <title>Notifications coming soon</title>
        {notificationsCanonical ? <link rel="canonical" href={notificationsCanonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Custom notifications and quiet hours are almost ready. You can keep studying while we finish the controls."
        />
      </Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="max-w-2xl mx-auto space-y-5 p-6 rounded-ds-2xl text-center">
            <h1 className="font-slab text-h2">Notifications are almost ready</h1>
            <p className="text-body text-mutedText">
              We&apos;re wrapping up daily nudges and quiet hours so you can control how GramorX reaches you.
            </p>
            <p className="text-body text-mutedText">
              Sit tight—we&apos;ll switch this on for your account soon and let you choose email, SMS, or WhatsApp updates.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/account">Go to account settings</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/study-plan">Continue studying</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}

function formatTimestamp(dateFormatter: Intl.DateTimeFormat, isoString: string) {
  try {
    return dateFormatter.format(new Date(isoString));
  } catch (error) {
    return isoString;
  }
}

function NotificationItem({ nudge, dateFormatter }: { nudge: NotificationNudge; dateFormatter: Intl.DateTimeFormat }) {
  return (
    <li className="rounded-ds-xl border border-border/60 bg-surface p-4 shadow-xs dark:bg-dark/40">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-body text-foreground">{nudge.message}</p>
          <p className="text-sm text-mutedText">{formatTimestamp(dateFormatter, nudge.createdAt)}</p>
          {nudge.url ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={nudge.url}>View details</Link>
            </Button>
          ) : null}
        </div>
        {!nudge.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden /> : null}
      </div>
    </li>
  );
}

export default function NotificationsCenter() {
  if (!notificationsEnabled) {
    return <NotificationsComingSoon />;
  }

  const [notifications, setNotifications] = useState<NotificationNudge[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      if (cursor) {
        setFetchingMore(true);
      } else {
        setLoading(true);
      }

      try {
        setError(null);
        const params = new URLSearchParams({ limit: PAGE_SIZE.toString() });
        if (cursor) {
          params.set('cursor', cursor);
        }
        const response = await fetch(`/api/notifications/list?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Unable to load notifications');
        }

        const json = await response.json();
        const parsed = NotificationListResponseSchema.parse(json);

        setNotifications((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          for (const item of parsed.items) {
            if (!seen.has(item.id)) {
              merged.push(item);
              seen.add(item.id);
            }
          }
          return merged;
        });
        setNextCursor(parsed.nextCursor);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Unknown error';
        setError(message);
      } finally {
        if (cursor) {
          setFetchingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || fetchingMore) {
      return;
    }
    void fetchPage(nextCursor);
  }, [fetchPage, fetchingMore, nextCursor]);

  return (
    <>
      <Head>
        <title>Notifications</title>
        {notificationsCanonical ? <link rel="canonical" href={notificationsCanonical} /> : null}
        <meta
          name="description"
          content="Review your latest GramorX nudges and release updates in one place."
        />
      </Head>
      <section className="py-24">
        <Container>
          <Card className="mx-auto max-w-3xl space-y-6 p-6">
            <div className="space-y-2">
              <h1 className="font-slab text-display">Notifications</h1>
              <p className="text-body text-mutedText">
                Nudges from the GramorX team about your progress, feature rollouts, and important account updates.
              </p>
            </div>

            {error ? (
              <div className="rounded-ds-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-ds-xl bg-muted/40 dark:bg-dark/40"
                    aria-hidden
                  />
                ))}
              </div>
            ) : null}

            {!loading && notifications.length === 0 && !error ? (
              <div className="rounded-ds-xl border border-border/60 bg-muted/20 p-6 text-center text-mutedText">
                You&apos;re all caught up. We&apos;ll drop new nudges here when something needs your attention.
              </div>
            ) : null}

            {notifications.length > 0 ? (
              <ul className="space-y-3">
                {notifications.map((nudge) => (
                  <NotificationItem key={nudge.id} nudge={nudge} dateFormatter={dateFormatter} />
                ))}
              </ul>
            ) : null}

            {nextCursor ? (
              <div className="flex justify-center">
                <Button onClick={handleLoadMore} disabled={fetchingMore} variant="outline">
                  {fetchingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </Card>
        </Container>
      </section>
    </>
  );
}
