import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const QuerySchema = z.object({
  orgId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
});

type Report = {
  userId: string;
  email: string;
  role: string;
  activityCount: number;
  lastActive: string | null;
};
type ReportsResponse =
  | { ok: true; orgId: string; reports: Report[] }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<ReportsResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { orgId, startDate, endDate, userId } = parsed.data;

  // Verify caller is org admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!membership) return res.status(403).json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' });

  // Verify org exists
  const { data: org } = await supabase.from('orgs').select('id').eq('id', orgId).maybeSingle();
  if (!org) return res.status(404).json({ ok: false, error: 'Organization not found', code: 'NOT_FOUND' });

  // Build query for user activity
  let query = supabase
    .from('org_members')
    .select('user_id, role, users!inner(email), activity_logs!left(id, created_at)')
    .eq('org_id', orgId);

  if (userId) query = query.eq('user_id', userId);
  if (startDate) query = query.gte('activity_logs.created_at', startDate);
  if (endDate) query = query.lte('activity_logs.created_at', endDate);

  const { data, error } = await query;

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  const reports: Report[] = (data ?? []).map((row) => ({
    userId: row.user_id,
    email: row.users!.email as string,
    role: row.role,
    activityCount: (row.activity_logs ?? []).length,
    lastActive: row.activity_logs?.[0]?.created_at ?? null,
  }));

  return res.status(200).json({ ok: true, orgId, reports });
}

export default withPlan('master', handler);
