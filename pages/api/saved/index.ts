import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const SAVED_DEFAULT_LIMIT = 20;

const QuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  cursor: z.string().optional(),
  resource_id: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  module: z.string().optional(),
  start: z.string().optional(), // ISO or parseable
  end: z.string().optional(),   // ISO or parseable
});

const SavedItemSchema = z.object({
  id: z.string(),
  resource_id: z.string(),
  type: z.string().nullable(),
  category: z.string().nullable(),
  created_at: z.string(),
});

const SavedListResponseSchema = z.object({
  items: z.array(SavedItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

type SavedListResponse = z.infer<typeof SavedListResponseSchema>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SavedListResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = getServerClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Normalize Next query (arrays -> first value)
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.query)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = QuerySchema.safeParse(normalized);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }

  const {
    limit,
    cursor,
    resource_id,
    type,
    category,
    search,
    module: moduleParam,
    start,
    end,
  } = parsed.data;

  const pageSize = limit ?? SAVED_DEFAULT_LIMIT;

  let query = supabase
    .from('user_bookmarks')
    .select('id, resource_id, type, category, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) query = query.lt('created_at', cursor);
  if (resource_id) query = query.eq('resource_id', resource_id);
  if (type) query = query.eq('type', type);
  if (category) query = query.eq('category', category);

  if (moduleParam && moduleParam.toLowerCase() !== 'all') {
    const m = moduleParam.toLowerCase();
    query = query.or(`type.eq.${m},category.eq.${m}`);
  }

  if (search) {
    query = query.ilike('resource_id', `%${search}%`);
  }

  if (start) {
    const s = new Date(start);
    if (!Number.isNaN(s.getTime())) query = query.gte('created_at', s.toISOString());
  }

  if (end) {
    const e = new Date(end);
    if (!Number.isNaN(e.getTime())) {
      const endDate = new Date(e);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }
  }

  const { data, error } = await query;
  if (error) {
    if ((error as { code?: string }).code === '42P01') {
      return res.status(200).json({ items: [], nextCursor: null, hasMore: false });
    }
    // RLS/permission safeguard
    if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(500).json({ error: error.message });
  }

  const hasMore = data.length > pageSize;
  const items = hasMore ? data.slice(0, pageSize) : data;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;

  const payload = { items, nextCursor, hasMore };
  const safe = SavedListResponseSchema.safeParse(payload);
  if (!safe.success) {
    return res.status(500).json({ error: 'Invalid saved items payload' });
  }

  return res.status(200).json(safe.data);
}
