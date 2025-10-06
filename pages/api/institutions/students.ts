import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const QuerySchema = z.object({
  orgId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

type Student = { id: string; email: string; name: string | null; joinedAt: string };
type StudentsResponse =
  | { ok: true; orgId: string; items: Student[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<StudentsResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { orgId, page, pageSize } = parsed.data;

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

  const { data, error, count } = await supabase
    .from('org_members')
    .select('user_id, created_at, users!inner(email, full_name)', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('role', 'student')
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  const items: Student[] = (data ?? []).map((row) => ({
    id: row.user_id,
    email: row.users!.email as string,
    name: row.users!.full_name as string | null,
    joinedAt: row.created_at,
  }));

  return res.status(200).json({ ok: true, orgId, items, total: count ?? 0, page, pageSize });
}

export default withPlan('master', handler);
