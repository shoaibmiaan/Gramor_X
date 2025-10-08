import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const SAVED_DEFAULT_LIMIT = 20;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient({ req });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { resource_id, type, category, limit: limitParam, cursor } = req.query as {
      resource_id?: string;
      type?: string;
      category?: string;
      limit?: string;
      cursor?: string;
    };

    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
    const limit = Number.isNaN(parsedLimit) ? 0 : Math.min(Math.max(parsedLimit, 1), 100);
    const usePagination = limit > 0 || !!cursor;

    let query = supabase
      .from('user_bookmarks')
      .select('resource_id, type, category, created_at')
      .eq('user_id', user.id);
    if (resource_id) query = query.eq('resource_id', resource_id);
    if (type) query = query.eq('type', type);
    if (category) query = query.eq('category', category);

    if (usePagination) {
      const pageLimit = limit || SAVED_DEFAULT_LIMIT;
      query = query.order('created_at', { ascending: false }).limit(pageLimit + 1);
      if (cursor) query = query.lt('created_at', cursor);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      const hasMore = data.length > pageLimit;
      const items = hasMore ? data.slice(0, pageLimit) : data;
      const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;
      return res.status(200).json({ items, nextCursor, hasMore });
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).end('Method Not Allowed');
}
