// lib/rate/usage.ts
import { getServerClient } from '@/lib/supabaseServer';
import type { NextApiRequest, NextApiResponse } from 'next';

export async function checkAndIncUsage(req: NextApiRequest, res: NextApiResponse, endpoint: string, limit = 50) {
  const supabase = getServerClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: rows } = await supabase
    .from('ai_usage')
    .select('id, used_at')
    .eq('user_id', user.id)
    .gte('used_at', new Date(new Date().toDateString())) // start of local day; adjust if needed
    .lte('used_at', new Date())
    .limit(1000);

  if ((rows?.length ?? 0) >= limit) {
    return { allowed: false, userId: user.id };
  }

  await supabase.from('ai_usage').insert({ user_id: user.id, endpoint });
  return { allowed: true, userId: user.id };
}
