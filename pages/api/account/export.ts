import { createHash, randomBytes } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { logAccountAudit } from '@/lib/audit';
import { env } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { sendTransactionalEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const ipHeader = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null;
    const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? null;

    const [profileRes, bookmarksRes, subscriptionsRes, studyPlansRes, attemptsRes, invoicesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_bookmarks').select('*').eq('user_id', user.id),
      supabase.from('subscriptions').select('*').eq('user_id', user.id),
      supabase.from('study_plans').select('*').eq('user_id', user.id),
      supabase.from('attempts').select('*').eq('user_id', user.id),
      supabase.from('invoices').select('*').eq('user_id', user.id),
    ]);

    if (profileRes.error && profileRes.error.code !== 'PGRST116') {
      throw profileRes.error;
    }

    for (const response of [bookmarksRes, subscriptionsRes, studyPlansRes, attemptsRes, invoicesRes]) {
      if (response.error) {
        throw response.error;
      }
    }

    const exportData = {
      profile: profileRes.data ?? null,
      bookmarks: bookmarksRes.data ?? [],
      subscriptions: subscriptionsRes.data ?? [],
      studyPlans: studyPlansRes.data ?? [],
      attempts: attemptsRes.data ?? [],
      invoices: invoicesRes.data ?? [],
    };

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabase.from('account_exports').insert({
      user_id: user.id,
      token_hash: tokenHash,
      payload: exportData as Record<string, unknown>,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      throw insertError;
    }

    const hostHeader = (req.headers['x-forwarded-host'] ?? req.headers.host) as string | string[] | undefined;
    const protocolHeader = req.headers['x-forwarded-proto'];
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader;
    const fallbackHost = host ? `${protocol ?? 'https'}://${host}` : 'http://localhost:3000';
    const baseUrl = (env.SITE_URL || env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_BASE_URL || fallbackHost).replace(/\/$/, '');
    const downloadUrl = `${baseUrl}/api/account/export/${token}`;

    const emailTextLines = [
      'Hi there,',
      '',
      'Your GramorX data export is ready. You can download it within the next 7 days using the secure link below:',
      downloadUrl,
      '',
      'If you did not request this export, please contact support immediately.',
      '',
      '— The GramorX Team',
    ];

    let emailed = false;
    if (user.email) {
      try {
        const result = await sendTransactionalEmail({
          to: user.email,
          subject: 'Your GramorX data export',
          text: emailTextLines.join('\n'),
        });
        emailed = result.sent;
      } catch (emailError) {
        console.error('Failed to send export email', emailError);
      }
    }

    await logAccountAudit(
      supabase,
      user.id,
      'account_export_requested',
      { token_expires_at: expiresAt.toISOString(), emailed, tables: Object.keys(exportData) },
      { ip, userAgent },
    );

    res.status(200).json({
      export: exportData,
      emailed,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Account export failed', error);
    res.status(500).json({ error: error?.message ?? 'Export failed' });
  }
}
