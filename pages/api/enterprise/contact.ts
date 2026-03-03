import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, email, company, message } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'name and email are required' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('enterprise_inquiries').insert({
    user_id: user?.id ?? null,
    name,
    email,
    company: company ?? null,
    message: message ?? null,
  });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true });
}
