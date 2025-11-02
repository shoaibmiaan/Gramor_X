import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  NotificationListQuerySchema,
  NotificationListResponseSchema,
} from '@/lib/schemas/notifications';
import { NotificationService } from '@/lib/notificationService';

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
  const service = new NotificationService(supabase);

  try {
    // Validate cursor format
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({ error: 'Invalid cursor format' });
      }
    }

    const result = await service.listNotifications(user.id, { cursor, limit });
    const payload = NotificationListResponseSchema.parse(result);

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error in notifications list API:', error);
    const message = error instanceof Error ? error.message : 'Failed to load notifications';
    return res.status(500).json({ error: message });
  }
}