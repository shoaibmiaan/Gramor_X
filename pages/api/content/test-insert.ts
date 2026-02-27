import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ id: string; title: string; user_id: string } | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = supabaseServer(req);  // Single arg only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { title, type = 'article', is_premium = false } = req.body;

  try {
    const { data, error } = await supabase
      .from('content')
      .insert({
        user_id: user.id,  // Authenticated: Sets real UID
        title,
        type,
        is_premium,
        content: null
      })
      .select('id, title, user_id')
      .single();

    if (error) throw error;  // RLS: "violates row-level security policy"
    return res.status(201).json(data);
  } catch (e: any) {
    return res.status(403).json({ error: e.message.includes('row-level security') ? 'Access denied: Premium requires Rocket+' : e.message });
  }
}