import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  try {
    const user = await requireAuth(supabase);
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!['admin', 'teacher'].includes(String((profile as any)?.role ?? ''))) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { data } = await supabase
      .from('analytics_daily')
      .select('day, dau, new_signups, conversion_rate, churn_rate, mrr, total_ai_requests, avg_test_score')
      .order('day', { ascending: false })
      .limit(90);

    return res.status(200).json({ metrics: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    return res.status(500).json({ error: 'analytics_fetch_failed' });
  }
}
