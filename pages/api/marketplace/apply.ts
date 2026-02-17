import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  bio: z.string().trim().min(20).max(1000),
  qualifications: z.string().trim().max(2000).optional(),
  specialties: z.array(z.string().max(100)).min(1).max(20),
});

type ApplyResponse =
  | { ok: true; applicationId: string }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'CONFLICT' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<ApplyResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { bio, qualifications, specialties } = parsed.data;

  // Check if user already has a pending/active application
  const { data: existing } = await supabase
    .from('marketplace_applications')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) return res.status(409).json({ ok: false, error: 'Application already exists', code: 'CONFLICT' });

  // Create application
  const { data: app, error } = await supabase
    .from('marketplace_applications')
    .insert({
      user_id: user.id,
      bio,
      qualifications: qualifications ?? null,
      specialties_json: specialties,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  return res.status(200).json({ ok: true, applicationId: app!.id as string });
}

export default withPlan('starter', handler);
