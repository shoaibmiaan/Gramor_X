import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  CreateNotificationSchema,
  NotificationNudgeSchema,
} from '@/lib/schemas/notifications';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gramorx.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // --- GET notifications ---
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, url, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const list = (data ?? []).map((row) =>
      NotificationNudgeSchema.parse({
        id: row.id,
        message: row.message ?? '',
        url: row.url ? (row.url.startsWith('/') ? `${BASE_URL}${row.url}` : row.url) : null,
        read: Boolean(row.read),
        createdAt: row.created_at.toISOString(),
      }),
    );

    // Removed welcome notification fallback - handle empty state in UI
    return res.status(200).json({
      notifications: list.map(({ createdAt, ...rest }) => ({ 
        ...rest, 
        created_at: createdAt, 
        url: rest.url 
      })),
      unread: list.filter((notification) => !notification.read).length,
    });
  }

  // --- POST notification ---
  if (req.method === 'POST') {
    const bodyResult = CreateNotificationSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Missing message or invalid payload' });
    }

    const { message, url } = bodyResult.data;

    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: user.id, message, url: url ?? null })
      .select('id, message, url, read, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    const notification = NotificationNudgeSchema.parse({
      id: data.id,
      message: data.message ?? '',
      url: data.url ? (data.url.startsWith('/') ? `${BASE_URL}${data.url}` : data.url) : null,
      read: Boolean(data.read),
      createdAt: data.created_at.toISOString(),
    });

    return res.status(201).json({
      notification: {
        ...notification,
        created_at: notification.createdAt,
        url: notification.url,
      },
    });
  }

  // --- Method Not Allowed ---
  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}