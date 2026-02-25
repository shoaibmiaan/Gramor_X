import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { env } from '@/lib/env';

const SITE_URL =
  env.NEXT_PUBLIC_SITE_URL ||
  env.SITE_URL ||
  'http://localhost:3000';

const BodySchema = z.object({
  email: z.string().email(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: true } | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = BodySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { email } = result.data;

  try {
    // 🔍 Log the key being used (first few chars)
    console.log('[forgot-password] Calling resetPasswordForEmail with email:', email);

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/update-password`,
    });

    if (error) {
      console.error('[forgot-password] Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forgot-password] Unexpected error:', err);
    return res.status(500).json({ error: message });
  }
}