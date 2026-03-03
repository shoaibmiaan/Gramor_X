import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '@/lib/requireRole';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireRole(req, ['admin']);
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, plans: data ?? [] });
  }

  if (req.method === 'POST') {
    const payload = req.body ?? {};
    if (!payload.id || !payload.name) {
      return res.status(400).json({ ok: false, error: 'id and name are required' });
    }

    const { error } = await supabaseAdmin.from('plans').upsert({
      id: payload.id,
      name: payload.name,
      description: payload.description ?? null,
      price_monthly: payload.price_monthly ?? null,
      price_yearly: payload.price_yearly ?? null,
      lifetime_price: payload.lifetime_price ?? null,
      features: payload.features ?? [],
      stripe_price_monthly_id: payload.stripe_price_monthly_id ?? null,
      stripe_price_yearly_id: payload.stripe_price_yearly_id ?? null,
      stripe_price_lifetime_id: payload.stripe_price_lifetime_id ?? null,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
