import type { NextApiRequest, NextApiResponse } from 'next';

import { createProgressShareToken, verifyProgressShareToken } from '@/lib/review/shareToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { env } from '@/lib/env';

type ShareResponse =
  | { token: string; url: string; expiresAt: string; ttlHours: number }
  | { reading: unknown }
  | { error: string };

function resolveBaseUrl(req: NextApiRequest) {
  const configured = env.NEXT_PUBLIC_BASE_URL || env.NEXT_PUBLIC_SITE_URL || env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host = req.headers.host ?? 'localhost:3000';
  return `${proto}://${host}`.replace(/\/$/, '');
}

async function fetchReadingStats(userId: string) {
  const { data: reading, error } = await supabaseAdmin
    .from('reading_user_stats')
    .select('attempts,total_score,total_max,accuracy_pct,avg_duration_ms,last_attempt_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return reading;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ShareResponse>) {
  if (req.method === 'POST') {
    const supabase = createSupabaseServerClient({ req });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { token, expiresAt, ttlHours } = createProgressShareToken(user.id);
    const baseUrl = resolveBaseUrl(req);

    return res.status(200).json({
      token,
      url: `${baseUrl}/progress/${token}`,
      expiresAt: expiresAt.toISOString(),
      ttlHours,
    });
  }

  if (req.method === 'GET') {
    const token = req.query.token;
    if (typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    try {
      const payload = verifyProgressShareToken(token);
      const reading = await fetchReadingStats(payload.userId);
      return res.status(200).json({ reading });
    } catch {
      // Backward compatibility for legacy DB-based UUID tokens.
      const { data: link, error } = await supabaseAdmin
        .from('progress_share_links')
        .select('user_id')
        .eq('token', token)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!link) return res.status(404).json({ error: 'Invalid or expired token' });

      const reading = await fetchReadingStats(link.user_id);
      return res.status(200).json({ reading });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
