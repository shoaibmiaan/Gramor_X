import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '@/lib/requireRole';
import { env } from '@/lib/env';
import { createPendingPayment } from '@/lib/billing/manual';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireRole(req, ['admin']);
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { userId, email, plan = 'master', cycle = 'annual', poNumber } = req.body ?? {};
  if (!userId || !email) {
    return res.status(400).json({ ok: false, error: 'userId and email are required' });
  }

  try {
    if (env.STRIPE_SECRET_KEY) {
      const StripeMod: any = await import('stripe');
      const Stripe = StripeMod.default ?? StripeMod;
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
          poNumber: poNumber ?? '',
        },
      });

      const invoice = await stripe.invoices.create({
        customer: customer.id,
        collection_method: 'send_invoice',
        days_until_due: 14,
        metadata: {
          userId,
          poNumber: poNumber ?? '',
          plan,
          cycle,
        },
      });

      await stripe.invoices.sendInvoice(invoice.id);

      return res.status(200).json({ ok: true, provider: 'stripe', invoiceId: invoice.id });
    }

    await createPendingPayment({ userId, email, plan, cycle, note: `Manual enterprise invoice. PO: ${poNumber ?? 'N/A'}` });
    return res.status(200).json({ ok: true, provider: 'manual_pending_payment' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
