import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { PreferencesBody, Channel } from '@/types/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabase.from('notifications_opt_in').select('*').eq('user_id', user.id).maybeSingle();
    return res.status(200).json({ preferences: data ?? {} });
  }

  if (req.method === 'POST') {
    const parsed = PreferencesBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    const channels = Object.entries(parsed.data.channels)
      .filter(([_, v]) => v)
      .map(([k]) => k as string);

    const { error: upsertError } = await supabase.from('notifications_opt_in').upsert({
      user_id: user.id,
      channels,
      email_opt_in: parsed.data.channels.email,
      wa_opt_in: parsed.data.channels.whatsapp,
      timezone: parsed.data.timezone,
      quiet_hours_start: parsed.data.quietHoursStart,
      quiet_hours_end: parsed.data.quietHoursEnd,
    }, { onConflict: 'user_id' });

    if (upsertError) return res.status(500).json({ error: upsertError.message });
    return res.status(200).json({ preferences: parsed.data });
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
