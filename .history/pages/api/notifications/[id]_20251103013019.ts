import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { MarkNotificationReadParamsSchema } from '@/lib/schemas/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const paramsResult = MarkNotificationReadParamsSchema.safeParse({ id: req.query.id });
  if (!paramsResult.success) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const { id } = paramsResult.data;

  if (req.method === 'PATCH') {
    // First verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Notification not found' });
      }
      return res.status(500).json({ error: fetchError.message });
    }

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Now update only if it belongs to the user
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'PATCH');
  return res.status(405).end('Method Not Allowed');
}