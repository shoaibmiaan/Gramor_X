// pages/api/blog/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface BlogPostResponse {
  ok: boolean;
  post?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content_md: string;
    category: string;
    tags: string[];
    read_min: number;
    likes: number;
    published_at: string | null;
    hero_image_url: string | null;
  };
  message?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BlogPostResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }
  const slug = String(req.query.slug || '').trim();
  if (!slug) return res.status(400).json({ ok: false, message: 'Missing slug' });

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY; // ensure env parsed
  if (!serviceKey) return res.status(500).json({ ok: false, message: 'Server misconfigured' });

  const supa = createSupabaseServerClient({ serviceRole: true });
  const { data, error } = await supa
    .from('blog_posts')
    .select('id,slug,title,excerpt,content_md,category,tags,read_min,likes,published_at,hero_image_url')
    .eq('status','published')
    .eq('slug', slug)
    .single();

  if (error || !data) return res.status(404).json({ ok: false, message: 'Not found' });
  return res.status(200).json({ ok: true, post: data as BlogPostResponse['post'] });
}
