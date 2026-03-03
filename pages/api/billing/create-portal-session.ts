// pages/api/billing/create-portal-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { stripe } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { enforceSameOrigin } from '@/lib/security/csrf';
import { isRecentAuthentication } from '@/lib/auth/recentAuth';
import { requireAuth, writeAuthError, AuthError } from '@/lib/auth';

type PortalResponse = { url: string } | { error: string };

const getOrigin = (req: NextApiRequest) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host =
    (req.headers['x-forwarded-host'] as string) ||
    req.headers.host ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'localhost:3000';

  return `${proto}://${host}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<PortalResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!enforceSameOrigin(req, res)) return;

  if (!stripe) return res.status(400).json({ error: 'stripe_not_configured' });

  const supabase = createSupabaseServerClient({ req, res });
  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }

  if (!isRecentAuthentication(req, 15 * 60)) {
    return res.status(403).json({ error: 'reauthentication_required' });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (error) return res.status(500).json({ error: 'profile_load_failed' });

  const customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) return res.status(400).json({ error: 'no_stripe_customer' });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getOrigin(req)}/account/billing`,
  });

  return res.status(200).json({ url: session.url });
}
