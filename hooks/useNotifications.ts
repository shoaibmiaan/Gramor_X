import * as React from 'react';
import useSWR from 'swr';
import type { NotificationNudge, NotificationListResponse } from '@/lib/schemas/notifications';

const NOTIFICATIONS_KEY = '/api/notifications';
const NOTIFICATIONS_LIST_KEY = '/api/notifications/list';

export function useNotifications() {
  const { data, error, mutate } = useSWR(NOTIFICATIONS_KEY, async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  });

  const notifications: NotificationNudge[] = data?.notifications || [];
  const unreadCount: number = data?.unread || 0;

  const markAsRead = React.useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      const optimisticData = {
        ...data,
        notifications: notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unread: Math.max(0, unreadCount - 1),
      };

      mutate(optimisticData, false);

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to mark as read');
      
      // Revalidate
      mutate();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      mutate(); // Revert by re-fetching
    }
  }, [data, mutate, notifications, unreadCount]);

  const markAllAsRead = React.useCallback(async () => {
    try {
      // Optimistic update
      const optimisticData = {
        ...data,
        notifications: notifications.map(n => ({ ...n, read: true })),
        unread: 0,
      };

      mutate(optimisticData, false);

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to mark all as read');
      
      mutate();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      mutate();
    }
  }, [data, mutate, notifications]);

  return {
    notifications,
    unreadCount,
    isLoading: !error && !data,
    isError: error,
    markAsRead,
    markAllAsRead,
    refresh: mutate,
  };
}

export function useNotificationsList(limit: number = 20) {
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<NotificationNudge[]>([]);
  const [hasMore, setHasMore] = React.useState(true);

  const { data, error, isLoading, mutate } = useSWR(
    cursor ? `${NOTIFICATIONS_LIST_KEY}?limit=${limit}&cursor=${cursor}` : `${NOTIFICATIONS_LIST_KEY}?limit=${limit}`,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json() as Promise<NotificationListResponse>;
    }
  );

  React.useEffect(() => {
    if (data) {
      setItems(prev => {
        // Avoid duplicates when cursor changes
        const newItems = cursor ? data.items : data.items;
        const merged = cursor ? [...prev, ...newItems] : newItems;
        
        // Remove duplicates by id
        return merged.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
      });
      setHasMore(!!data.nextCursor);
    }
  }, [data, cursor]);

  const loadMore = React.useCallback(() => {
    if (data?.nextCursor) {
      setCursor(data.nextCursor);
    }
  }, [data?.nextCursor]);

  const refresh = React.useCallback(() => {
    setCursor(null);
    setItems([]);
    mutate();
  }, [mutate]);

  return {
    items,
    isLoading,
    isError: error,
    hasMore,
    loadMore,
    refresh,
    unreadCount: data?.unreadCount || 0,
  };
}