// pages/api/billing/history.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next'; // Adjust if using Supabase auth
import Stripe from 'stripe';
import { getServerClient } from '@/lib/supabaseServer'; // For user fetch

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth check
    const supabase = getServerClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch profile for customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(404).json({ invoices: [] });
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit: 20, // Last 20 invoices
      status: 'all',
    });

    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created * 1000, // Timestamp to ISO
      description: inv.lines?.data[0]?.description || 'Subscription renewal',
      amount: inv.amount_due || 0,
      status: inv.status as any,
      pdfUrl: inv.status === 'paid' ? inv.hosted_invoice_url : undefined,
      subscriptionId: inv.subscription,
    }));

    res.status(200).json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Billing history fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}