import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/design-system/Toaster';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type Notification = {
  id: string;
  message: string;
  url?: string | null;
  read: boolean;
  created_at: string;
};

type Ctx = {
  notifications: Notification[];
  unread: number;
  markRead: (id: string) => Promise<void>;
};

const NotificationCtx = createContext<Ctx | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasSession, setHasSession] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) setHasSession(!!session);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setHasSession(!!session);
      if (!session) setNotifications([]);
    });

    return () => {
      subscription.unsubscribe();
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasSession) return;
    let active = true;

    const fetchNotifications = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('No session for fetching notifications');
          return;
        }
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.notifications)) throw new Error('Invalid response format');
        if (active) setNotifications(data.notifications);
      } catch (error) {
        console.error('Fetch notifications error:', error);
        toast.error('Failed to load notifications');
      }
    };

    fetchNotifications();

    return () => {
      active = false;
    };
  }, [hasSession, toast]);

  useEffect(() => {
    if (!hasSession) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: { new: Notification }) => {
          const n = payload.new;
          setNotifications(prev => [n, ...prev]);
          toast.info(n.message);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          toast.error('Error subscribing to notifications');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasSession, toast]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session for marking notification read');
        return;
      }
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      /* noop */
    }
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const value = { notifications, unread, markRead };

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationCtx);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}