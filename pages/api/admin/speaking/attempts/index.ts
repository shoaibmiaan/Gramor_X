import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireRole } from '@/lib/requireRole';

interface AttemptListItem {
  id: string;
  userId: string | null;
  createdAt: string;
  bandOverall: number | null;
  scenario: string | null;
  bandBreakdown: Record<string, unknown> | null;
}

interface AttemptListResponse {
  ok: true;
  total: number;
  page: number;
  size: number;
  items: Array<
    AttemptListItem & {
      user: { id: string | null; name: string | null; email: string | null };
    }
  >;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AttemptListResponse | { error: string }>,
) {
  try {
    await requireRole(req, ['admin', 'teacher']);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q = '', page = '1', size = '20' } = req.query as Record<string, string | undefined>;
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const sizeNum = Math.min(100, Math.max(5, parseInt(size || '20', 10)));

  const search = (q || '').trim();
  let query = supabaseAdmin
    .from('speaking_attempts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  let constrained = false;

  if (search) {
    if (isUuid(search)) {
      query = query.eq('id', search);
      constrained = true;
    } else {
      const { data: profileMatches, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

      if (profileError) {
        return res.status(500).json({ error: profileError.message });
      }

      const ids = (profileMatches || [])
        .map((row: { id?: string | null }) => (row?.id ? String(row.id) : null))
        .filter((id): id is string => Boolean(id));

      if (ids.length) {
        query = query.in('user_id', ids);
        constrained = true;
      } else {
        return res.status(200).json({ ok: true, total: 0, page: pageNum, size: sizeNum, items: [] });
      }
    }
  }

  const start = (pageNum - 1) * sizeNum;
  const end = start + sizeNum - 1;

  const { data, error, count } = await query.range(start, end);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const attempts: AttemptListItem[] = (data || []).map((row: any) => ({
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    createdAt: row.created_at,
    bandOverall:
      typeof row.band_overall === 'number'
        ? Number(row.band_overall)
        : typeof row.overall_band === 'number'
        ? Number(row.overall_band)
        : null,
    bandBreakdown:
      row.band_breakdown ??
      (row.p1_band || row.p2_band || row.p3_band
        ? {
            fluency: row.p1_band ?? null,
            lexical: row.p2_band ?? null,
            grammar: row.p3_band ?? null,
          }
        : null),
    scenario: row.scenario ?? null,
  }));

  const userIds = Array.from(new Set(attempts.map((a) => a.userId).filter((id): id is string => Boolean(id))));

  const profileMap = new Map<string, { name: string | null; email: string | null }>();

  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      return res.status(500).json({ error: profilesError.message });
    }

    (profiles || []).forEach((p: any) => {
      if (!p?.id) return;
      profileMap.set(String(p.id), {
        name: p.full_name ? String(p.full_name) : null,
        email: p.email ? String(p.email) : null,
      });
    });
  }

  return res.status(200).json({
    ok: true,
    total: constrained && count == null ? attempts.length : count ?? attempts.length,
    page: pageNum,
    size: sizeNum,
    items: attempts.map((attempt) => ({
      ...attempt,
      user: {
        id: attempt.userId ?? null,
        name: attempt.userId ? profileMap.get(attempt.userId)?.name ?? null : null,
        email: attempt.userId ? profileMap.get(attempt.userId)?.email ?? null : null,
      },
    })),
  });
}
