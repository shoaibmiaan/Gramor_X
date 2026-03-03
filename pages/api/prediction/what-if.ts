import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { AuthError, writeAuthError } from '@/lib/auth';
import { predictBandWhatIf } from '@/lib/prediction';
import { requirePremiumUser } from '@/lib/premiumRoute';

const schema = z.object({
  reading: z.number().min(0).max(9).optional(),
  writing: z.number().min(0).max(9).optional(),
  speaking: z.number().min(0).max(9).optional(),
  listening: z.number().min(0).max(9).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.flatten() });

  const supabase = createSupabaseServerClient({ req, res });
  try {
    const user = await requirePremiumUser(req, res);
    const prediction = await predictBandWhatIf(user.id, parsed.data, supabase as any);
    return res.status(200).json(prediction);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    return res.status(500).json({ error: 'prediction_what_if_failed' });
  }
}
