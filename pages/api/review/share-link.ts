import type { NextApiRequest, NextApiResponse } from 'next';

import { createReviewShareToken } from '@/lib/review/shareToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { captureException } from '@/lib/monitoring/sentry';
import { env } from '@/lib/env';

type Role = 'student' | 'teacher' | 'admin';

type ResponseBody =
  | { ok: true; data: { token: string; url: string; expiresAt: string; ttlHours: number; examType: string } }
  | { ok: false; error: string };

function resolveBaseUrl(req: NextApiRequest) {
  const configured = env.NEXT_PUBLIC_BASE_URL || env.NEXT_PUBLIC_SITE_URL || env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host = req.headers.host ?? 'localhost:3000';
  return `${proto}://${host}`.replace(/\/$/, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });

  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user ?? null;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const attemptId = typeof req.body?.attemptId === 'string' ? req.body.attemptId : null;
    if (!attemptId) {
      return res.status(400).json({ ok: false, error: 'Missing attempt id' });
    }

    const role = (user.app_metadata?.role ?? user.user_metadata?.role) as Role | undefined;
    const { data: attempt, error } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, user_id, exam_type')
      .eq('id', attemptId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!attempt) {
      return res.status(404).json({ ok: false, error: 'Attempt not found' });
    }

    const isOwner = attempt.user_id === user.id;
    const isStaff = role === 'teacher' || role === 'admin';
    if (!isOwner && !isStaff) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const { token, expiresAt, ttlHours } = createReviewShareToken(attempt.id);
    const baseUrl = resolveBaseUrl(req);
    const url = `${baseUrl}/review/share/${token}`;

    return res.status(200).json({
      ok: true,
      data: {
        token,
        url,
        expiresAt: expiresAt.toISOString(),
        ttlHours,
        examType: attempt.exam_type,
      },
    });
  } catch (error) {
    captureException(error, {
      route: '/api/review/share-link',
      method: req.method,
      attemptId: typeof req.body?.attemptId === 'string' ? req.body.attemptId : undefined,
    });
    return res.status(500).json({ ok: false, error: 'Failed to create share link' });
  }
}
