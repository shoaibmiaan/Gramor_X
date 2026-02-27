import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

// ---------- Types ----------
const SubscriptionRow = z.object({
  user_id: z.string(),
  plan_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),
});
type SubscriptionRow = z.infer<typeof SubscriptionRow>;

const ProfileRow = z.object({
  id: z.string(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(), // ok if your profiles table includes it; otherwise it will be null
  role: z.string(),                         // enum: student | teacher | admin
});
type ProfileRow = z.infer<typeof ProfileRow>;

const AdminUsersResponse = z.array(z.object({
  id: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  role: z.string(),
  subscription: z.object({
    plan_id: z.string().nullable(),
    status: z.string().nullable(),
    current_period_end: z.string().nullable(),
  }).nullable(),
}));
type AdminUsersResponse = z.infer<typeof AdminUsersResponse>;

// ---------- Handler ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getServerClient(req, res);

  // Auth
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) return res.status(500).json({ error: userErr.message });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Role guard (must be admin)
  const { data: meProfile, error: meErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (meErr) return res.status(500).json({ error: meErr.message });
  if (meProfile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  // Fetch profiles (id, email?, full_name, role)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('role', { ascending: true });
  if (pErr) return res.status(500).json({ error: pErr.message });

  const profilesParsed = z.array(ProfileRow).safeParse(profiles);
  if (!profilesParsed.success) {
    return res.status(500).json({ error: 'Profiles shape invalid', details: profilesParsed.error.flatten() });
  }

  // Fetch all subscriptions (map latest per user)
  const { data: subs, error: sErr } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id, status, current_period_end');
  if (sErr) return res.status(500).json({ error: sErr.message });

  const subsParsed = z.array(SubscriptionRow).safeParse(subs ?? []);
  if (!subsParsed.success) {
    return res.status(500).json({ error: 'Subscriptions shape invalid', details: subsParsed.error.flatten() });
  }

  // Pick the latest subscription per user_id (by current_period_end desc; nulls last)
  const latestByUser: Record<string, SubscriptionRow> = {};
  for (const row of subsParsed.data) {
    const curr = latestByUser[row.user_id];
    const currEnd = curr?.current_period_end ? Date.parse(curr.current_period_end) : -1;
    const nextEnd = row.current_period_end ? Date.parse(row.current_period_end) : -1;
    if (!curr || nextEnd >= currEnd) latestByUser[row.user_id] = row;
  }

  // Compose payload
  const payload: AdminUsersResponse = profilesParsed.data.map((p) => {
    const s = latestByUser[p.id];
    return {
      id: p.id,
      email: p.email ?? null,        // will be null if your profiles table doesn’t store email
      full_name: p.full_name ?? null,
      role: p.role,
      subscription: s ? {
        plan_id: s.plan_id ?? null,
        status: s.status ?? null,
        current_period_end: s.current_period_end ?? null,
      } : null,
    };
  });

  const ok = AdminUsersResponse.safeParse(payload);
  if (!ok.success) {
    return res.status(500).json({ error: 'Response shape invalid', details: ok.error.flatten() });
  }

  return res.status(200).json(payload);
}
