import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@/types/user';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { AuthError, requireAuth } from '@/lib/auth';
import { requireActiveSubscription } from '@/lib/subscription';

export async function requirePremiumUser(req: NextApiRequest, res: NextApiResponse): Promise<User> {
  const supabase = createSupabaseServerClient({ req, res });
  const user = await requireAuth(supabase);

  try {
    await requireActiveSubscription(supabase, user.id);
  } catch (error) {
    if ((error as Error).message === 'subscription_required' || (error as Error).message === 'subscription_inactive') {
      throw new AuthError('forbidden', 'subscription_required');
    }
    throw error;
  }

  return user;
}
