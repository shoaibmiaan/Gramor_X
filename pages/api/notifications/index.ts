import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  CreateNotificationSchema,
  NotificationNudgeSchema,
} from '@/lib/schemas/notifications';
import { NotificationService } from '@/lib/notificationService';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gramorx.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const service = new NotificationService(supabase);

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, url, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const list = (data ?? []).map((row) =>
        NotificationNudgeSchema.parse({
          id: row.id,
          message: row.message ?? '',
          url: row.url ? (row.url.startsWith('/') ? `${BASE_URL}${row.url}` : row.url) : null,
          read: Boolean(row.read),
          createdAt: row.created_at.toISOString(),
        }),
      );

      return res.status(200).json({
        notifications: list.map(({ createdAt, ...rest }) => ({ 
          ...rest, 
          created_at: createdAt, 
          url: rest.url 
        })),
        unread: list.filter((notification) => !notification.read).length,
      });
    }

    if (req.method === 'POST') {
      const bodyResult = CreateNotificationSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return res.status(400).json({ error: 'Invalid notification data' });
      }

      const notification = await service.createNotification(user.id, bodyResult.data);
      
      // Format URL for response
      const formattedNotification = {
        ...notification,
        url: notification.url ? 
          (notification.url.startsWith('/') ? `${BASE_URL}${notification.url}` : notification.url) 
          : null,
      };

      return res.status(201).json({
        notification: {
          ...formattedNotification,
          created_at: formattedNotification.createdAt,
        },
      });
    }

    if (req.method === 'PATCH') {
      // Mark all as read
      await service.markAllAsRead(user.id);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    return res.status(405).end('Method Not Allowed');
  } catch (error) {
    console.error('Error in notifications API:', error);
    const message = error instanceof Error ? error.message : 'Operation failed';
    return res.status(500).json({ error: message });
  }
}