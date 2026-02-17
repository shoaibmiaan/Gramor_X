import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const { token } = req.query;
  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data, error } = await supabaseAdmin
    .from('account_exports')
    .select('payload, expires_at, downloaded_at, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch account export token', error);
    return res.status(500).json({ error: error.message ?? 'Unable to fetch export' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Export not found' });
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Export link expired' });
  }

  try {
    await supabaseAdmin
      .from('account_exports')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);
    await supabaseAdmin.from('account_audit_log').insert({
      user_id: data.user_id,
      action: 'account_export_downloaded',
      metadata: { via: 'token' },
    });
  } catch (auditError) {
    console.error('Failed to record export download', auditError);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="gramorx-export.json"');
  res.status(200).send(JSON.stringify(data.payload, null, 2));
}
