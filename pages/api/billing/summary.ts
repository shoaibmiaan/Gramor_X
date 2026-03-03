// pages/api/billing/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { summarizeFromStripe, mapStripeInvoice, type SubscriptionSummary } from '@/lib/subscriptions';
import type { BillingSummaryResponse, DueRow } from '@/types/subscription';
import { getActiveSubscription, getActiveSubscriptionRecord } from '@/lib/subscription';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { requireAuth, AuthError, writeAuthError } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse<BillingSummaryResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');

  const supabase = createSupabaseServerClient({ req, res });

  let user;
  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) return writeAuthError(res, error.code);
    throw error;
  }

  const dbSubscription = await getActiveSubscriptionRecord(supabase, user.id);
  const customerIdFromMetadata =
    typeof dbSubscription?.metadata?.stripe_customer_id === 'string'
      ? dbSubscription.metadata.stripe_customer_id
      : null;
  let customerId = dbSubscription?.stripe_customer_id ?? customerIdFromMetadata;

  let dues: DueRow[] = [];
  try {
    const { data: rows } = await supabase
      .from('pending_payments')
      .select('id, amount_cents, currency, created_at, status, plan_key, cycle')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    dues = (rows ?? []).filter((d) => d.status === 'due') as DueRow[];
  } catch {
    dues = [];
  }

  if (!stripe) {
    return res.status(200).json({
      ok: true,
      summary: {
        plan: (dbSubscription?.plan_id as SubscriptionSummary['plan']) ?? 'free',
        status: 'canceled',
      },
      invoices: [],
      dues,
      customerId: customerId ?? undefined,
      needsStripeSetup: true,
    });
  }

  if (!customerId) {
    const cust = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = cust.id;

    await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          plan_id: dbSubscription?.plan_id ?? 'free',
          status: dbSubscription?.status ?? 'inactive',
          stripe_customer_id: customerId,
          metadata: {
            ...(dbSubscription?.metadata ?? {}),
            stripe_customer_id: customerId,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 3,
    expand: ['data.items.data.price'],
  });

  const sub = getActiveSubscription(subs.data) ?? subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
  const summary = summarizeFromStripe(sub, (dbSubscription?.plan_id as SubscriptionSummary['plan']) ?? 'free');

  const invs = await stripe.invoices.list({
    customer: customerId,
    limit: 12,
    status: 'open,paid,void,uncollectible,draft',
  });

  const invoices = invs.data.map(mapStripeInvoice);

  return res.status(200).json({ ok: true, summary, invoices, customerId, dues });
}
