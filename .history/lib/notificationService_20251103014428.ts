import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { CreateNotificationInput, NotificationNudge } from './schemas/notifications';

export class NotificationService {
  constructor(private supabase: ReturnType<typeof createClient<Database>>) {}

  async createNotification(
    userId: string,
    input: CreateNotificationInput
  ): Promise<NotificationNudge> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message: input.message,
        url: input.url || null,
      })
      .select('id, message, url, read, created_at')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create notification');

    return {
      id: data.id,
      message: data.message || '',
      url: data.url,
      read: Boolean(data.read),
      createdAt: data.created_at.toISOString(),
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    // Verify ownership first
    const { data: notification } = await this.supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();

    if (!notification) {
      throw new Error('Notification not found');
    }

    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }

  async listNotifications(
    userId: string,
    options: { cursor?: string; limit: number }
  ) {
    let query = this.supabase
      .from('notifications')
      .select('id, message, url, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(options.limit + 1); // Fetch one extra to check for next page

    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    const notifications = (data || []).map((row) => ({
      id: row.id,
      message: row.message || '',
      url: row.url,
      read: Boolean(row.read),
      createdAt: row.created_at.toISOString(),
    }));

    const items = notifications.slice(0, options.limit);
    const hasMore = notifications.length > options.limit;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt : null;

    return {
      items,
      nextCursor,
      unreadCount: items.filter(item => !item.read).length,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }

  async checkRateLimit(
    userId: string,
    eventKey: string,
    limit: number
  ): Promise<boolean> {
    if (limit <= 0) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await this.supabase
      .from('notification_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_key', eventKey)
      .gte('created_at', today.toISOString());

    if (error) throw error;
    return (count || 0) < limit;
  }

  async recordEvent(
    userId: string,
    eventKey: string,
    idempotencyKey?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('notification_events')
      .insert({
        user_id: userId,
        event_key: eventKey,
        idempotency_key: idempotencyKey,
      });

    if (error) throw error;
  }
}