import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { AuthError, requireAuth, writeAuthError } from '@/lib/auth';
import type { AuthErrorResponse } from '@/types/auth';
import { ExamDateBody } from '@/lib/onboarding/schema';
import { updateProfileForUser } from '@/lib/profile/update';

type Data = { ok: true } | { ok: false; error: string; details?: unknown } | AuthErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
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

  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) {
      return writeAuthError(res, error.code, error.message);
    }
    throw error;
  }

  const { error } = await updateProfileForUser(supabase, user.id, {
    exam_timeframe: timeframe,
    exam_date: examDate ?? null,
  });

  if (error) {
    return res.status(500).json({ ok: false, error: `DB error: ${error.message}` });
  }

  return res.status(200).json({ ok: true });
}
