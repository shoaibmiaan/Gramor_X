import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  AdminTeacherApproveRequest,
  AdminTeacherApproveResponse,
} from '@/types/api/admin-teachers';
import { supabaseServer } from '@/lib/supabaseServer';
import { adminApproveTeacher } from '@/lib/db/admin-teachers';
import { withPlan } from '@/lib/apiGuard';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminTeacherApproveResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  // (Optional but helpful) ensure caller is authenticated
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as AdminTeacherApproveRequest;
  if (!body?.userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const profile = await adminApproveTeacher(supabase, body);
    return res.status(200).json({ ok: true, profile });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}

export default withPlan('master', handler);
