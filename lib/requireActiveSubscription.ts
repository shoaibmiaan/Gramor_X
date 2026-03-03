import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { AuthError, requireAuth, writeAuthError } from '@/lib/auth';
import { isSubscriptionActive } from '@/lib/subscription';

export async function requireApiActiveSubscription(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req, res });

  try {
    const user = await requireAuth(supabase);
    const active = await isSubscriptionActive(supabase, user.id);
    if (!active) {
      res.status(403).json({ ok: false, error: 'subscription_required' });
      return null;
    }
    return user;
  } catch (error) {
    if (error instanceof AuthError) {
      writeAuthError(res, error.code);
      return null;
    }
    throw error;
  }
}
