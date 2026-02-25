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

  const handleMarkAsRead = React.useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setItems(prev => prev.map(item => 
        item.id === notificationId ? { ...item, read: true } : item
      ));

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setItems(prev => prev.map(item => 
          item.id === notificationId ? { ...item, read: false } : item
        ));
        throw new Error('Failed to mark as read');
      }
    } catch (err) {
      console.error('[notifications] mark as read error', err);
      setError('Failed to mark notification as read');
    }
  }, []);

  const handleMarkAllAsRead = React.useCallback(async () => {
    const unreadIds = items.filter(item => !item.read).map(item => item.id);
    if (unreadIds.length === 0) return;

    try {
      // Optimistic update
      setItems(prev => prev.map(item => ({ ...item, read: true })));

      // Mark each notification as read individually
      await Promise.all(
        unreadIds.map(id => 
          fetch(`/api/notifications/${id}`, { method: 'PATCH' })
        )
      );
    } catch (err) {
      console.error('[notifications] mark all as read error', err);
      setError('Failed to mark all as read');
      // TODO: Revert optimistic update on error (would need to refetch)
    }
  }, [items]);

  const hasNotifications = items.length > 0;
  const hasUnread = items.some(item => !item.read);

  return (
    <>
      <Head>
        <title>Notifications | GramorX</title>
      </Head>
      <Container className="mx-auto max-w-4xl space-y-8 py-10">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption uppercase tracking-[0.2em] text-muted-foreground">Inbox</p>
              <h1 className="font-slab text-h2 text-foreground">Notifications</h1>
            </div>
            {hasUnread && (
              <Button 
                onClick={handleMarkAllAsRead} 
                variant="soft" 
                size="sm"
              >
                Mark all as read
              </Button>
            )}
          </div>
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
                      <div className="flex items-center gap-2">
                        {unreadBadge}
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-caption text-muted-foreground">{formatted}</p>
                  </article>
                );

                return (
                  <li key={notification.id} className="px-5 hover:bg-muted/50 transition-colors">
                    {notification.url ? (
                      <Link
                        href={notification.url}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div onClick={() => !notification.read && handleMarkAsRead(notification.id)}>
                        {content}
                      </div>
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
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(ctx.resolvedUrl ?? '/notifications');
    return {
      redirect: {
        destination: `/login?next=${next}`,
        permanent: false,
      },
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gramorx.com';
  const limitPlusOne = PAGE_SIZE + 1;

  const { data, error } = await supabase
    .from('notifications')
    .select('id, message, url, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limitPlusOne);

  if (error) {
    return {
      props: {
        initial: EMPTY_PAYLOAD,
        loadError: error.message,
      },
    };
  }

  const notifications = (data ?? []).map((row) => ({
    id: row.id,
    message: row.message ?? 'Notification',
    url:
      row.url && row.url.trim() !== ''
        ? row.url.startsWith('http')
          ? row.url
          : `${baseUrl}${row.url}` // relative -> absolute
        : null,
    read: Boolean(row.read),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : typeof row.created_at === 'string' && !isNaN(Date.parse(row.created_at))
        ? new Date(row.created_at).toISOString()
        : new Date().toISOString(),
  }));

  const items = notifications.slice(0, PAGE_SIZE);
  const hasMore = notifications.length > PAGE_SIZE;
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt ?? null : null;

  // REMOVED: Automatic mark-as-read in getServerSideProps
  // This is now handled explicitly by user actions

  const initial = NotificationListResponseSchema.parse({
    items,
    nextCursor,
    unreadCount: items.filter(item => !item.read).length,
  });

  return {
    props: {
      initial,
      loadError: null,
    },
  };
};

export default NotificationsPage;