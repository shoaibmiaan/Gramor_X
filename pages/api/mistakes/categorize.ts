// pages/api/mistakes/categorize.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  id: z.string().min(1),
  action: z.enum(['toggle_resolved']),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parse = Body.safeParse(req.body ?? {});
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const { id, action } = parse.data;
  const supabase = getServerClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (action === 'toggle_resolved') {
      // Read resolved state from review view when available, else table
      const { data: row, error: selErr } = await supabase
        .from('mistakes_book')
        .select('resolved')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (selErr) return res.status(500).json({ error: selErr.message });
      const next = !(row?.resolved ?? false);

      const { error: upErr } = await supabase
        .from('mistakes_book')
        .update({ resolved: next, resolved_at: next ? new Date().toISOString() : null })
        .eq('id', id)
        .eq('user_id', user.id);

      if (upErr) return res.status(500).json({ error: upErr.message });
      return res.status(200).json({ success: true, resolved: next });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('mistakes categorize', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
