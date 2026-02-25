import type { NextApiRequest, NextApiResponse } from 'next';

import { logAccountAudit } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { confirm, acknowledge } = (req.body ?? {}) as { confirm?: string; acknowledge?: boolean };
  if (confirm !== 'DELETE' || acknowledge !== true) {
    return res.status(400).json({ error: 'Deletion confirmation missing' });
  }

  const ipHeader = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null;
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
  const uaHeader = req.headers['user-agent'];
  const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader ?? null;

  const now = new Date();
  const purgeAfter = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const { error: queueError } = await supabase.from('account_deletion_queue').upsert({
      user_id: user.id,
      requested_at: now.toISOString(),
      purge_after: purgeAfter.toISOString(),
      status: 'pending',
      last_error: null,
      metadata: { acknowledge, email: user.email ?? null },
    });

    if (queueError) {
      throw queueError;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        pending_deletion: true,
        deletion_requested_at: now.toISOString(),
        deletion_confirmed_at: purgeAfter.toISOString(),
      })
      .eq('user_id', user.id);

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    await logAccountAudit(
      supabase,
      user.id,
      'account_deletion_requested',
      { purge_after: purgeAfter.toISOString() },
      { ip, userAgent },
    );

    return res.status(202).json({ success: true, purgeAfter: purgeAfter.toISOString() });
  } catch (error: any) {
    console.error('Account deletion request failed', error);
    return res.status(500).json({ error: error?.message ?? 'Deletion failed' });
  }
}
