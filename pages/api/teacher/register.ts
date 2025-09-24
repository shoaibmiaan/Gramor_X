import type { NextApiRequest, NextApiResponse } from 'next';
import type { RegisterTeacherRequest, RegisterTeacherResponse } from '@/types/api/teacher';
import { supabaseServer } from '@/lib/supabaseServer';
import { upsertMyTeacherProfile } from '@/lib/db/teacher';
import { teacherRegisterSchema } from '@/lib/validation/teacher';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterTeacherResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = supabaseServer(req, res);

  // Strictly validate input
  const parsed = teacherRegisterSchema.safeParse(req.body as RegisterTeacherRequest);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
  }

  try {
    const profile = await upsertMyTeacherProfile(supabase, parsed.data);
    // Never set teacher_approved here — admin-only elsewhere
    return res.status(200).json({ profile });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
