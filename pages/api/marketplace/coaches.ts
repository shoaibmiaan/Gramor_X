import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  specialty: z.string().max(100).optional(),
});

type Coach = {
  id: string;
  userId: string;
  name: string | null;
  bio: string;
  specialties: string[];
};
type CoachesResponse =
  | { ok: true; items: Coach[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<CoachesResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  // Optional: add auth check for consistency
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { page, pageSize, specialty } = parsed.data;

  let query = supabase
    .from('coaches')
    .select('id, user_id, users!inner(full_name), marketplace_applications!inner(bio, specialties_json)', { count: 'exact' })
    .eq('marketplace_applications.status', 'approved');

  if (specialty) {
    query = query.contains('marketplace_applications.specialties_json', [specialty]);
  }

  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  const items: Coach[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.users!.full_name as string | null,
    bio: row.marketplace_applications!.bio as string,
    specialties: row.marketplace_applications!.specialties_json as string[],
  }));

  return res.status(200).json({ ok: true, items, total: count ?? 0, page, pageSize });
}

export default withPlan('free', handler);
