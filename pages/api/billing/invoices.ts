import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';
import { getActiveSubscriptionRecord } from '@/lib/subscription';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }

  const subscription = await getActiveSubscriptionRecord(supabase, user.id);
  const customerId = subscription?.stripe_customer_id ?? (subscription?.metadata?.stripe_customer_id as string | undefined);

  if (!stripe || !customerId) return res.status(200).json({ invoices: [] });

  const invoices = await stripe.invoices.list({ customer: customerId, limit: 20 });
  return res.status(200).json({
    invoices: invoices.data.map((inv) => ({
      id: inv.id,
      date: new Date((inv.created ?? 0) * 1000).toISOString(),
      amount: inv.amount_paid ?? inv.amount_due ?? 0,
      currency: inv.currency,
      status: inv.status,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
    })),
  });
}
