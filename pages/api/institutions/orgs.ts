import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

type Org = { id: string; name: string; role: 'student' | 'teacher' | 'admin' };
type OrgsResponse =
  | { ok: true; items: Org[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<OrgsResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { page, pageSize } = parsed.data;

  const { data, error, count } = await supabase
    .from('org_members')
    .select('org_id, role, orgs!inner(name)', { count: 'exact' })
    .eq('user_id', user.id)
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  const items: Org[] = (data ?? []).map((row) => ({
    id: row.org_id,
    name: row.orgs!.name as string,
    role: row.role as 'student' | 'teacher' | 'admin',
  }));

  return res.status(200).json({ ok: true, items, total: count ?? 0, page, pageSize });
}

export default withPlan('master', handler);
