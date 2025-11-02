import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DateTime } from 'luxon';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  NotificationListResponseSchema,
  type NotificationListResponse,
  type NotificationNudge,
} from '@/lib/schemas/notifications';

const PAGE_SIZE = 20;

type NotificationsPageProps = {
  initial: NotificationListResponse;
  loadError?: string | null;
};

function formatTimestamp(iso: string): string {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return '';
  const relative = dt.toRelative({ style: 'long' });
  return relative ?? dt.toLocaleString(DateTime.DATETIME_MED);
}

const EMPTY_PAYLOAD: NotificationListResponse = {
  items: [],
  nextCursor: null,
  unreadCount: 0,
};

const NotificationsPage: React.FC<NotificationsPageProps> = ({ initial, loadError = null }) => {
  const [items, setItems] = React.useState<NotificationNudge[]>(initial.items);
  const [nextCursor, setNextCursor] = React.useState<string | null>(initial.nextCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(loadError);

  const handleLoadMore = React.useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (nextCursor) params.set('cursor', nextCursor);

      const response = await fetch(`/api/notifications/list?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load more notifications.');

      const json = await response.json();
      const payload = NotificationListResponseSchema.parse(json);

      setItems((prev) => [...prev, ...payload.items]);
      setNextCursor(payload.nextCursor);
    } catch (err) {
      console.error('[notifications] load more error', err);
      setError('Unable to load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

  const hasNotifications = items.length > 0;

  return (
    <>
      <Head>
        <title>Notifications | GramorX</title>
      </Head>
      <Container className="mx-auto max-w-4xl space-y-8 py-10">
        <header className="space-y-3">
          <p className="text-caption uppercase tracking-[0.2em] text-muted-foreground">Inbox</p>
          <h1 className="font-slab text-h2 text-foreground">Notifications</h1>
          <p className="text-body text-muted-foreground">
            See announcements, study nudges, and progress updates across your GramorX workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/settings/notifications" variant="soft" tone="info" size="sm">
              Manage preferences
            </Button>
            <Button href="/dashboard" variant="outline" size="sm">
              Back to dashboard
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="error" title="Something went wrong" className="max-w-2xl" role="alert">
            {error}
          </Alert>
        )}

        <section aria-live="polite" className="space-y-6">
          {hasNotifications ? (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card/50">
              {items.map((notification) => {
                const formatted = formatTimestamp(notification.createdAt);
                const unreadBadge = notification.read ? null : (
                  <span className="inline-flex items-center rounded-full bg-electricBlue/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-electricBlue">
                    New
                  </span>
                );

                const content = (
                  <article className="flex flex-col gap-1 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-small font-semibold text-foreground">{notification.message}</h2>
                      {unreadBadge}
                    </div>
                    <p className="text-caption text-muted-foreground">{formatted}</p>
                  </article>
                );

                return (
                  <li key={notification.id} className="px-5">
                    {notification.url ? (
                      <Link
                        href={notification.url}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
              <h2 className="font-slab text-h4 text-foreground">You&apos;re all caught up</h2>
              <p className="mt-2 text-small text-muted-foreground">
                We&apos;ll drop a notification here when there&apos;s something new—like streak milestones, study reminders, or
                payment updates.
              </p>
              <div className="mt-6 flex justify-center">
                <Button href="/learning" size="sm" variant="primary">
                  Explore practice modules
                </Button>
              </div>
            </div>
          )}

          {nextCursor && (
            <div className="flex justify-center">
              <Button onClick={handleLoadMore} disabled={loadingMore} variant="ghost" size="sm">
                {loadingMore ? 'Loading…' : 'Load older notifications'}
              </Button>
            </div>
          )}
        </section>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<NotificationsPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient({ req: ctx.re
