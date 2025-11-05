// pages/api/notifications/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

type RawRow = Record<string, any>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const supabase = createSupabaseServerClient({ req, res });
    // select all columns to be defensive against schema differences
    const { data, error } = await supabase
      .from<RawRow>('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notifications] supabase error', error);
      return res.status(500).json({ error: error.message ?? 'db_error' });
    }

    const rows = (data ?? []).map((row) => {
      // Pick title/body from common column names
      const title = row.title ?? row.subject ?? row.message ?? row.body ?? null;
      const bodyText = row.body ?? row.message ?? row.details ?? null;

      // Defensive timestamp -> ISO
      let createdAtIso: string | null = null;
      try {
        const d = new Date(row.created_at as any);
        createdAtIso = isNaN(d.getTime()) ? null : d.toISOString();
      } catch {
        createdAtIso = null;
      }

      return {
        id: row.id ?? null,
        user_id: row.user_id ?? null,
        title,
        body: bodyText,
        created_at: createdAtIso,
        raw: row, // keep raw row for debugging (optional)
      };
    });

    return res.status(200).json({ ok: true, notifications: rows });
  } catch (err: any) {
    console.error('[notifications] unhandled error', err);
    return res.status(500).json({ error: err?.message ?? 'unexpected' });
  }
}
