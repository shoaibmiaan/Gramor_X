// pages/api/blog/modqueue.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface ModQueueItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  read_min: number;
  author_user_id: string | null;
  submitted_at: string | null;
  created_at: string;
}
export interface ModQueueResponse {
  ok: boolean;
  items?: ModQueueItem[];
  message?: string;
}

function bad(res: NextApiResponse, code: number, message: string) {
  return res.status(code).json({ ok: false, message });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ModQueueResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return bad(res, 405, 'Method Not Allowed');
  }
  // Simple admin gate
  if (!env.ADMIN_API_TOKEN || req.headers['x-admin-token'] !== env.ADMIN_API_TOKEN) {
    return bad(res, 403, 'Forbidden');
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return bad(res, 500, 'Server misconfigured.');

  const supa = createSupabaseServerClient({ serviceRole: true });

  const { data, error } = await supa
    .from('blog_posts')
    .select('id,slug,title,excerpt,category,tags,read_min,author_user_id,submitted_at,created_at')
    .eq('status','submitted')
    .order('submitted_at', { ascending: false });

  if (error) return bad(res, 500, 'Failed to fetch moderation queue');
  return res.status(200).json({ ok: true, items: (data ?? []) as ModQueueItem[] });
}
