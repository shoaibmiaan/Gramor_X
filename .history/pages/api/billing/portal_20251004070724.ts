// pages/api/billing/portal.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { serialize } from 'cookie';

type PortalResponse = { url: string } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<PortalResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!stripe) return res.status(400).json({ error: 'stripe_not_configured' });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies[name],
        set: (name: string, value: string, options: any) => {
          res.setHeader('Set-Cookie', serialize(name, value, options));
        },
        remove: (name: string, options: any) => {
          res.setHeader('Set-Cookie', serialize(name, '', { ...options, maxAge: 0 }));
        },
      },
    }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (error) return res.status(500).json({ error: 'profile_load_failed' });
  const customerId = profile?.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: 'no_stripe_customer' });

  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  const origin = `${proto}://${host}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/account/billing`,
  });

  return res.status(200).json({ url: session.url });
}
