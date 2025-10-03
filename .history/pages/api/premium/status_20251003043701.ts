// pages/api/premium/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Resp = {
  pinOk: boolean;
  loggedIn: boolean;
  userId: string | null;
  plan: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  const pinOk = req.cookies?.pr_pin_ok === '1';

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(200).json({ pinOk, loggedIn: false, userId: null, plan: null });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return res.status(200).json({ pinOk, loggedIn: false, userId: null, plan: null });
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  return res.status(200).json({
    pinOk,
    loggedIn: true,
    userId: user.id,
    plan: (prof?.plan ?? null) as string | null,
  });
}
