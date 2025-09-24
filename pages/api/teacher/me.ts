import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetMyTeacherResponse } from '@/types/api/teacher';
import { supabaseServer } from '@/lib/supabaseServer';
import { getMyTeacherProfile } from '@/lib/db/teacher';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<GetMyTeacherResponse | { error: string }>
) {
  const supabase = supabaseServer(_req, res);
  try {
    const profile = await getMyTeacherProfile(supabase);
    return res.status(200).json({ profile });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
