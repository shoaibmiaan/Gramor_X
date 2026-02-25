// pages/api/mistakes/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { scheduleSpacedReview } from '@/lib/experiments/spaced-intervals';

type MistakeRow = {
  id: string;
  mistake: string;
  correction: string | null;
  type: string | null;
  repetitions: number | null;
  next_review: string | null;
  retry_path: string | null;
  created_at: string;
  last_seen_at?: string | null;
  resolved_at?: string | null;
};

type MistakeTag = { key: string; value: string };

type MistakePayload = {
  id: string;
  prompt: string;
  correction: string | null;
  skill: string;
  repetitions: number;
  nextReview: string | null;
  retryPath: string | null;
  createdAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  tags: MistakeTag[];
};

const FALLBACK_CODES = new Set(['42P01', '42703']);

const PutBody = z.object({
  id: z.string().min(1),
  repetitions: z.number().int().min(0).optional(),
});

const PatchBody = z.object({
  id: z.string().min(1),
  resolved: z.boolean(),
});

const PostBody = z.object({
  mistake: z.string().min(1),
  correction: z.string().optional(),
  type: z.string().optional(),
  retryPath: z.string().nullable().optional(),
});

const DeleteBody = z.object({
  id: z.string().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServerClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();

    const selectCols =
      'id,mistake,correction,type,repetitions,next_review,retry_path,created_at,last_seen_at,resolved_at';

    let query = supabase
      .from('mistake_review_queue')
      .select(selectCols)
      .eq('user_id', user.id)
      .is('resolved_at', null)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    let { data, error } = await query;
    let rows: MistakeRow[] = (data as any) ?? [];

    if (error && FALLBACK_CODES.has(error.code ?? '')) {
      let fb = supabase
        .from('mistakes_book')
        .select('id,mistake,correction,type,repetitions,next_review,retry_path,created_at,last_seen_at')
        .eq('user_id', user.id)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(limit + 1);
      if (cursor) fb = fb.lt('created_at', cursor);

      const fbRes = await fb;
      error = fbRes.error;
      rows = (fbRes.data as any) ?? [];

      if (!error) {
        const { data: resolvedData } = await supabase
          .from('mistake_resolutions')
          .select('mistake_id')
          .eq('user_id', user.id);
        if (resolvedData?.length) {
          const resolvedIds = new Set(resolvedData.map((r: { mistake_id: string }) => r.mistake_id));
          rows = rows.filter((r) => !resolvedIds.has(r.id));
        }
      }
    }

    if (error) return res.status(500).json({ error: error.message });

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    const items = trimmed.map(mapRow).filter(Boolean) as MistakePayload[];
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.created_at ?? null : null;

    return res.status(200).json({ items, nextCursor });
  }

  if (req.method === 'POST') {
    const parse = PostBody.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
    }
    const { mistake, correction, type, retryPath } = parse.data;

    const { data, error } = await supabase
      .from('mistakes_book')
      .insert({ user_id: user.id, mistake, correction: correction ?? null, type: type ?? null, retry_path: retryPath ?? null })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(mapRow(data as MistakeRow));
  }

  if (req.method === 'PUT') {
    const parse = PutBody.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
    }
    const { id, repetitions } = parse.data;
    const nextReps = Number.isFinite(repetitions) ? Math.max(0, Math.floor(repetitions!)) : 0;
    const nextReview = await scheduleSpacedReview(user.id, nextReps);
    const payload = {
      repetitions: nextReps,
      next_review: nextReview.toISOString(),
      last_seen_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('mistakes_book')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(mapRow(data as MistakeRow));
  }

  if (req.method === 'PATCH') {
    const parse = PatchBody.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
    }
    const { id, resolved } = parse.data;

    if (resolved) {
      const { error } = await supabase
        .from('mistake_resolutions')
        .upsert({ user_id: user.id, mistake_id: id, resolved_at: new Date().toISOString() });
      if (error && error.code !== '23505') return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase
        .from('mistake_resolutions')
        .delete()
        .eq('user_id', user.id)
        .eq('mistake_id', id);
      if (error) return res.status(500).json({ error: error.message });
    }

    const { data, error } = await supabase
      .from('mistake_review_queue')
      .select('id,mistake,correction,type,repetitions,next_review,retry_path,created_at,last_seen_at,resolved_at')
      .eq('user_id', user.id)
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ item: mapRow(data as MistakeRow | null) });
  }

  if (req.method === 'DELETE') {
    const parse = DeleteBody.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
    }
    const { id } = parse.data;

    const { error } = await supabase
      .from('mistakes_book')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET,POST,PUT,PATCH,DELETE');
  return res.status(405).end('Method Not Allowed');
}

function mapRow(row: MistakeRow | null | undefined): MistakePayload | null {
  if (!row) return null;
  const { retryPath, tags } = parseRetryPath(row.retry_path ?? null);
  return {
    id: row.id,
    prompt: row.mistake,
    correction: row.correction ?? null,
    skill: row.type ?? 'general',
    repetitions: row.repetitions ?? 0,
    nextReview: row.next_review ?? null,
    retryPath,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? row.created_at,
    resolvedAt: row.resolved_at ?? null,
    tags,
  };
}

function parseRetryPath(raw: string | null): { retryPath: string | null; tags: MistakeTag[] } {
  if (!raw) return { retryPath: null, tags: [] };
  try {
    const base = raw.startsWith('http') ? raw : `https://mistakes.local${raw.startsWith('/') ? '' : '/'}${raw}`;
    const url = new URL(base);
    const cleanParams = new URLSearchParams();
    const tags: MistakeTag[] = [];

    url.searchParams.forEach((value, key) => {
      if (key.toLowerCase() === 'tag') {
        const parsed = decodeTag(value);
        if (parsed) tags.push(parsed);
      } else {
        cleanParams.append(key, value);
      }
    });

    const search = cleanParams.toString();
    const retryPath = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
    return { retryPath, tags };
  } catch {
    return { retryPath: raw, tags: [] };
  }
}

function decodeTag(input: string): MistakeTag | null {
  if (!input) return null;
  const [rawKey, ...rest] = input.split(':');
  const value = rest.join(':').trim();
  if (!value) return null;
  const key = prettifyTagKey(rawKey || 'Tag');
  return { key, value };
}

function prettifyTagKey(raw: string): string {
  return raw
    .split(/[\s_\-|]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
