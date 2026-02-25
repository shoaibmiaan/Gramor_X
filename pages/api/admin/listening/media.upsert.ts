// pages/api/admin/listening/media.upsert.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(['audio','video']),
  url: z.string().url(),
  duration_secs: z.number().int().nonnegative(),
  transcript: z.string().optional().nullable(),
  accent: z.enum(['uk','us','aus','mix']),
  level: z.enum(['beginner','intermediate','advanced']),
  tags: z.array(z.string()).default([]),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const roleRow = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = roleRow.data?.role ?? 'student';
  if (role !== 'admin' && role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });

  const payload = parse.data;
  const up = await supabase
    .from('listening_media')
    .upsert([{
      id: payload.id, kind: payload.kind, url: payload.url, duration_secs: payload.duration_secs,
      transcript: payload.transcript ?? null, accent: payload.accent, level: payload.level, tags: payload.tags,
    }])
    .select('id')
    .single();

  if (up.error) return res.status(500).json({ error: up.error.message });
  return res.status(200).json({ ok: true, id: up.data?.id });
}
