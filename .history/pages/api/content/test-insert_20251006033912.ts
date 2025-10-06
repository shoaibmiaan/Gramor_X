import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ id: string } | { error: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = supabaseServer(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { title, type = 'article', is_premium = false } = req.body;

  try {
    const { data, error } = await supabase
      .from('content')
      .insert({ user_id: user.id, title, type, is_premium, content: null })
      .select('id')
      .single();

    if (error) throw error;
    return res.status(201).json({ id: data.id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });  // Will catch RLS violations
  }
}