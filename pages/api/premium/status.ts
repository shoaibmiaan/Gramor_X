// pages/api/premium/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Resp = {
  pinOk: boolean;
  loggedIn: boolean;
  userId: string | null;
  plan: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ pinOk: false, loggedIn: false, userId: null, plan: null });
  }

  const pinOk = req.cookies?.pr_pin_ok === '1';

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(200).json({ pinOk, loggedIn: false, userId: null, plan: null });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(200).json({ pinOk, loggedIn: false, userId: null, plan: null });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  return res.status(200).json({
    pinOk,
    loggedIn: true,
    userId: user.id,
    plan: (profile?.plan ?? null) as string | null,
  });
}