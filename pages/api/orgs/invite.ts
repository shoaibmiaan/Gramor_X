// pages/api/orgs/invite.ts
import type { NextApiHandler } from 'next';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';

const tokenAlphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const tokenGenerator = customAlphabet(tokenAlphabet, 24);

const InviteSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = InviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { orgId, email, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const { data: membership } = await supabaseService
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes((membership.role as string) ?? '')) {
    return res.status(403).json({ error: 'Only org admins can invite members' });
  }

  const token = tokenGenerator();
  const { data, error } = await supabaseService
    .from('organization_invites')
    .upsert(
      {
        org_id: orgId,
        email: normalizedEmail,
        role,
        token,
        invited_by: user.id,
        accepted_at: null,
        metadata: { source: 'manual-invite' },
      },
      { onConflict: 'org_id,email' },
    )
    .select('id, email, role, token, expires_at')
    .single();

  if (error || !data) {
    return res.status(500).json({ error: 'Failed to create invite', details: error });
  }

  return res.status(200).json({
    ok: true,
    invite: {
      id: data.id,
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expires_at,
    },
  });
};

export default handler;
