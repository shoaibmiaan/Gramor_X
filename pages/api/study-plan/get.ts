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

  const { data: plan, error } = await supabase
    .from('user_study_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No active plan found
      return res.status(404).json({ error: 'No study plan found' });
    }
    console.error('Error fetching study plan:', error);
    return res.status(500).json({ error: 'Failed to fetch study plan' });
  }

  return res.status(200).json({ plan: plan.plan });
}