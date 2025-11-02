import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  NotificationListQuerySchema,
  NotificationListResponseSchema,
} from '@/lib/schemas/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parseResult = NotificationListQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }

  const { cursor, limit } = parseResult.data;

  // Validate cursor format
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (isNaN(cursorDate.getTime())) {
      return res.status(400).json({ error: 'Invalid cursor format' });
    }
  }

  const limitPlusOne = limit + 1;
  let query = supabase
    .from('notifications')
    .select('id, message, url, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limitPlusOne);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const notifications = (data ?? []).map((row) => ({
    id: row.id,
    message: row.message ?? '',
    url: row.url ?? null,
    read: Boolean(row.read),
    createdAt: row.created_at,
  }));

  const items = notifications.slice(0, limit);
  const hasMore = notifications.length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt ?? null : null;

  // REMOVED: Automatic mark-as-read functionality
  // Let clients explicitly mark notifications as read via PATCH endpoint

  const payload = NotificationListResponseSchema.parse({
    items,
    nextCursor,
    unreadCount: items.filter(item => !item.read).length,
  });

  return res.status(200).json(payload);
}