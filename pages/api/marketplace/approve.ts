import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  applicationId: z.string().uuid(),
  approved: z.boolean(),
  feedback: z.string().max(1000).optional(),
});

type ApproveResponse =
  | { ok: true; applicationId: string; status: 'approved' | 'rejected' }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<ApproveResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  // Verify caller is admin (assumes admin_users table or similar)
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!admin) return res.status(403).json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { applicationId, approved, feedback } = parsed.data;

  // Load application
  const { data: app, error: aErr } = await supabase
    .from('marketplace_applications')
    .select('id, user_id, status')
    .eq('id', applicationId)
    .maybeSingle();

  if (aErr) return res.status(500).json({ ok: false, error: aErr.message, code: 'DB_ERROR' });
  if (!app) return res.status(404).json({ ok: false, error: 'Application not found', code: 'NOT_FOUND' });

  const newStatus = approved ? 'approved' : 'rejected';

  // Update application
  const { error: uErr } = await supabase
    .from('marketplace_applications')
    .update({ status: newStatus, feedback: feedback ?? null })
    .eq('id', applicationId);

  if (uErr) return res.status(500).json({ ok: false, error: uErr.message, code: 'DB_ERROR' });

  // If approved, add to coaches table
  if (approved) {
    await supabase
      .from('coaches')
      .insert({ user_id: app.user_id })
      .catch(() => {}); // Best-effort
  }

  return res.status(200).json({ ok: true, applicationId, status: newStatus });
}

export default withPlan('master', handler);
