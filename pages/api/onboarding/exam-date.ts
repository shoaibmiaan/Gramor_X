import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { ExamDateBody } from '@/lib/onboarding/schema';
import { updateProfileForUser } from '@/lib/profile/update';

type Data =
  | { ok: true }
  | { ok: false; error: string; details?: unknown };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const parse = ExamDateBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid body',
      details: parse.error.flatten(),
    });
  }

  const { timeframe, examDate } = parse.data;

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return res
      .status(500)
      .json({ ok: false, error: `Auth error: ${userError.message}` });
  }
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { error } = await updateProfileForUser(supabase, user.id, {
    exam_timeframe: timeframe,
    exam_date: examDate ?? null,
  });

  if (error) {
    return res
      .status(500)
      .json({ ok: false, error: `DB error: ${error.message}` });
  }

  return res.status(200).json({ ok: true });
}
