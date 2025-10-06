import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  orgId: z.string().uuid(),
  users: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(['student', 'teacher']).default('student'),
    })
  ).min(1).max(1000),
});

type BulkEnrollResponse =
  | { ok: true; orgId: string; enrolled: number; failed: Array<{ email: string; error: string }> }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<BulkEnrollResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { orgId, users } = parsed.data;

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

  const failed: Array<{ email: string; error: string }> = [];
  let enrolled = 0;

  for (const { email, role } of users) {
    // Check if user exists
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!targetUser) {
      failed.push({ email, error: 'User not found' });
      continue;
    }

    // Check for existing membership
    const { data: existing } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existing) {
      failed.push({ email, error: 'User already enrolled' });
      continue;
    }

    // Enroll
    const { error } = await supabase
      .from('org_members')
      .insert({ org_id: orgId, user_id: targetUser.id, role });

    if (error) {
      failed.push({ email, error: error.message });
      continue;
    }

    enrolled++;
  }

  return res.status(200).json({ ok: true, orgId, enrolled, failed });
}

export default withPlan('master', handler);
