// pages/api/me/plan.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';

type Resp = { ok: true; plan: PlanId } | { ok: false; plan: PlanId };

function normalize(s?: string | null): PlanId {
  const v = (s ?? 'free').toLowerCase();
  if (v === 'starter' || v === 'booster' || v === 'master' || v === 'free') return v;
  return 'free';
}

function isEmailInAdminList(email?: string | null) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const list = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  const supabase = supabaseServer(req);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) return res.status(200).json({ ok: false, plan: 'free' });

  // 1) Admin/teacher bypass (treat as master)
  const appRole =
    (user.app_metadata as any)?.role ??
    (user.user_metadata as any)?.role ??
    null;

  if (appRole === 'admin' || appRole === 'teacher' || isEmailInAdminList(user.email)) {
    return res.status(200).json({ ok: true, plan: 'master' });
  }

  // 2) Profile plan (fallback)
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_id, role')
    .eq('id', user.id)
    .maybeSingle();

  // If profile.role says admin/teacher, also bypass
  if (profile?.role === 'admin' || profile?.role === 'teacher') {
    return res.status(200).json({ ok: true, plan: 'master' });
  }

  const plan = normalize(profile?.plan_id as string | undefined);
  return res.status(200).json({ ok: true, plan });
}
