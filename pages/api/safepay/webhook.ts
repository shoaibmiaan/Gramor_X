import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // TODO: verify HMAC/signature from Safepay here.
  const event = req.body as { reference: string; status: 'paid' | 'failed'; amount_minor: number; receipt_url?: string };

  const supabase = getServerClient(req, res);
  await supabase
    .from('payment_intents')
    .update({
      status: event.status === 'paid' ? 'succeeded' : 'failed',
      provider_receipt_url: event.receipt_url ?? null,
      paid_at: event.status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('reference', event.reference);

  res.status(200).json({ ok: true });
}
