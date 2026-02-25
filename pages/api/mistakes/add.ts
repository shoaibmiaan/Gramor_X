// pages/api/mistakes/add.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

type ModuleKey = 'listening' | 'reading' | 'writing' | 'speaking';

const TagSchema = z.object({
  key: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(120),
});

const MistakeSchema = z.object({
  questionId: z.string().trim().min(1).max(64),
  prompt: z.string().trim().min(1).max(240),
  correctAnswer: z.string().trim().max(240).optional().nullable(),
  givenAnswer: z.string().trim().max(240).optional().nullable(),
  retryPath: z.string().trim().max(240).optional().nullable(),
  skill: z.string().trim().max(64).optional(),
  tags: z.array(TagSchema).max(8).optional(),
});

const BodySchema = z.object({
  attemptId: z.string().trim().min(1).max(64),
  module: z.enum(['listening', 'reading', 'writing', 'speaking']),
  paperId: z.string().trim().max(64).optional(),
  mistakes: z.array(MistakeSchema).max(60),
});

type TagInput = z.infer<typeof TagSchema>;

type ResponseBody =
  | { ok: true; inserted: number; skipped: number; insertedIds?: string[] }
  | { ok: false; error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'invalid_payload', details: parsed.error.flatten() });
  }

  if (!parsed.data.mistakes.length) {
    return res.status(200).json({ ok: true, inserted: 0, skipped: 0, insertedIds: [] });
  }

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' });

  // Prepare
  const prepared = parsed.data.mistakes.map((item) => {
    const tags = dedupeTags(item.tags ?? []);
    const basePath = normaliseBasePath(item.retryPath, parsed.data.module, parsed.data.paperId, item.questionId);
    const retryPath = attachTags(basePath, tags);
    const tagsForInsert = tags.map((t) => `${t.key}:${t.value}`);

    return {
      questionId: item.questionId,
      prompt: item.prompt,
      correction: item.correctAnswer?.trim() ?? null,
      skill: item.skill?.trim() || parsed.data.module,
      retryPath,
      tags: tagsForInsert,
    };
  });

  // Existing paths
  const uniquePaths = Array.from(new Set(prepared.map((p) => p.retryPath).filter(Boolean))) as string[];
  const existingPaths = new Set<string>();
  if (uniquePaths.length > 0) {
    const { data: existing, error: fetchErr } = await supabase
      .from('mistakes_book')
      .select('retry_path')
      .eq('user_id', user.id)
      .in('retry_path', uniquePaths);

    if (!fetchErr) {
      (existing ?? []).forEach((r: { retry_path: string | null }) => {
        if (r.retry_path) existingPaths.add(r.retry_path);
      });
    } else {
      // eslint-disable-next-line no-console
      console.error('failed to fetch existing retry paths', fetchErr);
    }
  }

  const freshItems = prepared.filter((i) => !i.retryPath || !existingPaths.has(i.retryPath));
  const now = new Date().toISOString();

  // Update last_seen_at for existing
  if (existingPaths.size > 0) {
    const { error: upErr } = await supabase
      .from('mistakes_book')
      .update({ last_seen_at: now })
      .eq('user_id', user.id)
      .in('retry_path', Array.from(existingPaths));
    if (upErr) console.error('failed to update last_seen_at', upErr);
  }

  let inserted = 0;
  const insertedIds: string[] = [];

  if (freshItems.length > 0) {
    const insertPayload = freshItems.map((item) => ({
      user_id: user.id,
      mistake: item.prompt,
      correction: item.correction,
      type: item.skill,
      retry_path: item.retryPath ?? null,
      tags: item.tags && item.tags.length ? item.tags : null,
      last_seen_at: now,
      created_at: now,
    }));

    const { error: insertErr, data } = await supabase
      .from('mistakes_book')
      .insert(insertPayload)
      .select('id');

    if (insertErr) {
      console.error('insert mistakes failed', insertErr);
      return res.status(500).json({ ok: false, error: insertErr.message });
    }

    inserted = data?.length ?? 0;
    (data ?? []).forEach((row: any) => row?.id && insertedIds.push(row.id));
  }

  const skipped = parsed.data.mistakes.length - inserted;
  return res.status(200).json({ ok: true, inserted, skipped, insertedIds });
}

/* helpers */
function dedupeTags(tags: TagInput[]): TagInput[] {
  const seen = new Set<string>();
  const result: TagInput[] = [];
  tags.forEach((t) => {
    const key = t.key.trim();
    const value = t.value.trim();
    if (!key || !value) return;
    const sig = `${key.toLowerCase()}::${value.toLowerCase()}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    result.push({ key, value });
  });
  return result;
}

function normaliseBasePath(
  retryPath: string | null | undefined,
  module: ModuleKey,
  paperId: string | undefined,
  questionId: string,
): string {
  const fallbackBase = paperId ? `/mock/${module}/${paperId}` : `/mock/${module}`;
  const base = retryPath && retryPath.trim() ? retryPath.trim() : `${fallbackBase}?focus=${encodeURIComponent(questionId)}`;
  try {
    const url = new URL(base.startsWith('http') ? base : `https://mistakes.local${base.startsWith('/') ? '' : '/'}${base}`);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return base;
  }
}

function attachTags(path: string, tags: TagInput[]): string {
  if (!path) return path;
  try {
    const url = new URL(path.startsWith('http') ? path : `https://mistakes.local${path.startsWith('/') ? '' : '/'}${path}`);
    tags.forEach((t) => url.searchParams.append('tag', `${t.key}:${t.value}`));
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
  } catch {
    const query = tags.map((t) => `tag=${encodeURIComponent(`${t.key}:${t.value}`)}`).join('&');
    if (!query) return path;
    return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
  }
}
