import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['student', 'teacher', 'admin']).default('student'),
});

type InviteResponse =
  | { ok: true; orgId: string; inviteId: string }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<InviteResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { orgId, email, role } = parsed.data;

  // Verify caller is org admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!membership) return res.status(403).json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' });

  // Verify org exists
  const { data: org } = await supabase.from('orgs').select('id').eq('id', orgId).maybeSingle();
  if (!org) return res.status(404).json({ ok: false, error: 'Organization not found', code: 'NOT_FOUND' });

  // Create invite
  const { data: invite, error } = await supabase
    .from('org_invites')
    .insert({
      org_id: orgId,
      email,
      role,
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select('id')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  // TODO: trigger email (use your existing notification service)
  return res.status(200).json({ ok: true, orgId, inviteId: invite!.id as string });
}

export default withPlan('master', handler);
