import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { ExamDateBody } from '@/lib/onboarding/schema';

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

  const updatePayload: Record<string, unknown> = {
    exam_timeframe: timeframe,
  };

  if (examDate) {
    // Depending on your column type, you may want only YYYY-MM-DD here.
    updatePayload.exam_date = examDate;
  } else {
    updatePayload.exam_date = null;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (error) {
    return res
      .status(500)
      .json({ ok: false, error: `DB error: ${error.message}` });
  }

  return res.status(200).json({ ok: true });
}
