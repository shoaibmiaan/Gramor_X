import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if an active study plan exists
  const { data: plan, error } = await supabase
    .from('user_study_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('Error checking study plan status:', error);
    return res.status(500).json({ error: 'Failed to check status' });
  }

  if (plan) {
    return res.status(200).json({ status: 'ready' });
  } else {
    return res.status(200).json({ status: 'pending' });
  }
}