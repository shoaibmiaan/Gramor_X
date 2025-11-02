import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { MarkNotificationReadParamsSchema } from '@/lib/schemas/notifications';
import { NotificationService } from '@/lib/notificationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const paramsResult = MarkNotificationReadParamsSchema.safeParse({ id: req.query.id });
  if (!paramsResult.success) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  const { id } = paramsResult.data;
  const service = new NotificationService(supabase);

  try {
    if (req.method === 'PATCH') {
      await service.markAsRead(user.id, id);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).end('Method Not Allowed');
  } catch (error) {
    console.error('Error in notification API:', error);
    const message = error instanceof Error ? error.message : 'Operation failed';
    const status = message.includes('not found') ? 404 : 500;
    return res.status(status).json({ error: message });
  }
}