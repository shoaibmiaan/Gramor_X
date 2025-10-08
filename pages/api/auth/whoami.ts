// pages/api/auth/whoami.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient(req, res);
  const { data } = await supabase.auth.getUser();
  return res.status(200).json({ user: data?.user ?? null });
}
