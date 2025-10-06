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

  /
