import type { NextApiRequest, NextApiResponse } from 'next';

import { requireRole } from '@/lib/requireRole';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type AlertRow = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  user_email: string | null;
  details: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: true; rows?: AlertRow[]; total?: number; page?: number; limit?: number; totalPages?: number; hasMore?: boolean; updated?: boolean } | { ok: false; error: string }>,
) {
  try {
    await requireRole(req, ['admin']);
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  try {
    if (req.method === 'GET') {
      const { resolved = '', severity = '', type = '', page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      let query = supabaseAdmin
        .from('alerts')
        .select('id,type,severity,user_id,details,resolved,created_at,resolved_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (resolved === 'true' || resolved === 'false') query = query.eq('resolved', resolved === 'true');
      if (severity) query = query.eq('severity', severity);
      if (type) query = query.eq('type', type);

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      const userIds = Array.from(new Set((data ?? []).map((row: any) => row.user_id).filter(Boolean)));
      const emailMap = new Map<string, string>();

      if (userIds.length) {
        const { data: profiles } = await supabaseAdmin.from('profiles').select('id,email').in('id', userIds);
        for (const profile of profiles ?? []) {
          emailMap.set(String((profile as any).id), String((profile as any).email ?? ''));
        }
      }

      const rows: AlertRow[] = (data ?? []).map((row: any) => ({
        ...row,
        user_email: row.user_id ? emailMap.get(String(row.user_id)) ?? null : null,
      }));

      const total = count ?? rows.length;
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return res.status(200).json({ ok: true, rows, total, page: pageNum, limit: limitNum, totalPages, hasMore: pageNum < totalPages });
    }

    if (req.method === 'PATCH') {
      const { id, resolved } = req.body as { id?: string; resolved?: boolean };
      if (!id || typeof resolved !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'id and resolved are required' });
      }

      const { error } = await supabaseAdmin
        .from('alerts')
        .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ ok: true, updated: true });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message || 'Failed to process alerts request' });
  }
}
