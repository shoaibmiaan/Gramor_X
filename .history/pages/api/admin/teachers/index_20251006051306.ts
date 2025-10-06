import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  AdminTeachersListQuery,
  AdminTeachersListResponse,
} from '@/types/api/admin-teachers';
import { supabaseServer } from '@/lib/supabaseServer';
import { adminListTeachers } from '@/lib/db/admin-teachers';
import { withPlan } from '@/lib/apiGuard';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminTeachersListResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  // (Optional) basic auth check
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const q = (req.query.q as string | undefined) || '';
  const status: AdminTeachersListQuery['status'] =
    (req.query.status as string) === 'pending' ? 'pending' : 'all';
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt((req.query.pageSize as string) || '20', 10))
  );

  try {
    const { items, total } = await adminListTeachers(supabase, {
      q,
      status,
      page,
      pageSize,
    });
    return res.status(200).json({ items, total, page, pageSize });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}

export default withPlan('master', handler);
