import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ id: string; title: string } | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = supabaseServer(req);  // <-- Uses req for cookie/auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { title, type = 'article', is_premium = false } = req.body;

  try {
    const { data, error } = await supabase
      .from('content')
      .insert({
        user_id: user.id,  // <-- Key: Set from auth
        title,
        type,
        is_premium,
        content: null  // Or JSON body if needed
      })
      .select('id, title')
      .single();

    if (error) throw error;  // Catches RLS: "violates row-level security policy"
    return res.status(201).json(data);
  } catch (e: any) {
    console.error('Insert error:', e);  // Log for QA
    return res.status(403).json({ error: e.message || 'Forbidden (RLS violation?)' });
  }
}