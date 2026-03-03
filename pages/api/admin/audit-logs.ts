import type { NextApiRequest, NextApiResponse } from 'next';

import { requireRole } from '@/lib/requireRole';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type AuditRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: true; rows: AuditRow[]; total: number; page: number; limit: number; totalPages: number; hasMore: boolean } | { ok: false; error: string }>,
) {
  try {
    await requireRole(req, ['admin']);
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id,user_id,action,resource,resource_id,ip_address,user_agent,metadata,old_data,new_data,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);
    if (resource) query = query.eq('resource', resource);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    const userIds = Array.from(new Set((data ?? []).map((row: any) => row.user_id).filter(Boolean)));
    const profileMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id,email')
        .in('id', userIds);

      for (const p of profiles ?? []) {
        profileMap.set(String((p as any).id), ((p as any).email as string | null) ?? null);
      }
    }

    const rows: AuditRow[] = (data ?? []).map((row: any) => ({
      ...row,
      user_email: row.user_id ? profileMap.get(String(row.user_id)) ?? null : null,
    }));

    const total = count ?? rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return res.status(200).json({
      ok: true,
      rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasMore: pageNum < totalPages,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message || 'Failed to load audit logs' });
  }
}
