import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  contentId: z.string().uuid(),
  isPublic: z.boolean().default(true),
});

type PublishResponse =
  | { ok: true; contentId: string; status: 'published' }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<PublishResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { contentId, isPublic } = parsed.data;

  // Verify ownership
  const { data: item, error: iErr } = await supabase
    .from('content_items')
    .select('id, owner_id, status')
    .eq('id', contentId)
    .maybeSingle();

  if (iErr) return res.status(500).json({ ok: false, error: iErr.message, code: 'DB_ERROR' });
  if (!item) return res.status(404).json({ ok: false, error: 'Content not found', code: 'NOT_FOUND' });
  if (item.owner_id !== user.id) return res.status(403).json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' });

  // Update status
  const { error: uErr } = await supabase
    .from('content_items')
    .update({ status: 'published', is_public: isPublic })
    .eq('id', contentId);

  if (uErr) return res.status(500).json({ ok: false, error: uErr.message, code: 'DB_ERROR' });

  return res.status(200).json({ ok: true, contentId, status: 'published' });
}

export default withPlan('master', handler);
