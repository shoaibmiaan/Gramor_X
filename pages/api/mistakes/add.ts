import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

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
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let parsed;
  try {
    parsed = BodySchema.parse(req.body ?? {});
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'invalid_payload'
        : 'invalid_payload';
    return res.status(400).json({ ok: false, error: message });
  }

  if (!parsed.mistakes.length) {
    return res.status(200).json({ ok: true, inserted: 0, skipped: 0, insertedIds: [] });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  // Prepare items: dedupe tags, normalise retryPath (and attach tags to retryPath query)
  const prepared = parsed.mistakes.map((item) => {
    const tags = dedupeTags(item.tags ?? []);
    const basePath = normaliseBasePath(
      item.retryPath,
      parsed.module,
      parsed.paperId,
      item.questionId,
    );
    const retryPath = attachTags(basePath, tags);

    // tagsForInsert: array of 'key:value' strings (Postgres text[])
    const tagsForInsert = tags.map((t) => `${t.key}:${t.value}`);

    return {
      questionId: item.questionId,
      prompt: item.prompt,
      correction: item.correctAnswer?.trim() ?? null,
      skill: item.skill?.trim() || parsed.module,
      retryPath,
      tags: tagsForInsert,
    };
  });

  // Find unique retry paths to detect existing rows
  const uniquePaths = Array.from(
    new Set(
      prepared
        .map((p) => p.retryPath)
        .filter((path): path is string => Boolean(path)),
    ),
  );

  // Find existing rows by retry_path for this user
  const existingPaths = new Set<string>();
  if (uniquePaths.length > 0) {
    const { data: existing, error: fetchErr } = await supabase
      .from('mistakes_book')
      .select('retry_path')
      .eq('user_id', user.id)
      .in('retry_path', uniquePaths);

    if (fetchErr) {
      // Non-fatal: log and continue — we'll treat as no existing rows (but surface an error if insert fails)
      // eslint-disable-next-line no-console
      console.error('failed to fetch existing retry paths', fetchErr);
    } else {
      (existing ?? []).forEach((row: { retry_path: string | null }) => {
        if (row.retry_path) existingPaths.add(row.retry_path);
      });
    }
  }

  // Fresh items are those without retryPath OR whose retryPath not in existingPaths
  const freshItems = prepared.filter(
    (item) => !item.retryPath || !existingPaths.has(item.retryPath),
  );

  const now = new Date().toISOString();

  // Update last_seen_at for matches (if any)
  if (existingPaths.size > 0) {
    const { error: updateErr } = await supabase
      .from('mistakes_book')
      .update({ last_seen_at: now })
      .eq('user_id', user.id)
      .in('retry_path', Array.from(existingPaths));

    if (updateErr) {
      // Non-fatal but log it
      // eslint-disable-next-line no-console
      console.error('failed to update last_seen_at for existing mistakes', updateErr);
    }
  }

  // Insert fresh items, persist tags into tags column (text[])
  let inserted = 0;
  const insertedIds: string[] = [];

  if (freshItems.length > 0) {
    const insertPayload = freshItems.map((item) => ({
      user_id: user.id,
      // keep field names similar to your system: 'mistake' stores prompt text
      mistake: item.prompt,
      correction: item.correction,
      type: item.skill,
      retry_path: item.retryPath ?? null,
      tags: item.tags && item.tags.length ? item.tags : null, // Postgres text[] or null
      last_seen_at: now,
      created_at: now,
    }));

    const { error: insertError, data } = await supabase
      .from('mistakes_book')
      .insert(insertPayload)
      .select('id');

    if (insertError) {
      // Surface error — this is a real failure
      // eslint-disable-next-line no-console
      console.error('insert mistakes failed', insertError);
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    inserted = (data?.length ?? 0);
    if (Array.isArray(data)) {
      // data items are { id: ... } shape
      data.forEach((row: any) => {
        if (row?.id) insertedIds.push(row.id);
      });
    }
  }

  const skipped = parsed.mistakes.length - inserted;
  return res.status(200).json({ ok: true, inserted, skipped, insertedIds });
}

/* ---------- helpers (kept from your original with small tweaks) ---------- */

function dedupeTags(tags: TagInput[]): TagInput[] {
  const seen = new Set<string>();
  const result: TagInput[] = [];

  tags.forEach((tag) => {
    const key = tag.key.trim();
    const value = tag.value.trim();
    if (!key || !value) return;
    const signature = `${key.toLowerCase()}::${value.toLowerCase()}`;
    if (seen.has(signature)) return;
    seen.add(signature);
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
    const url = new URL(base, base.startsWith('http') ? base : `https://mistakes.local${base.startsWith('/') ? '' : '/'}${base}`);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return base;
  }
}

function attachTags(path: string, tags: TagInput[]): string {
  if (!path) return path;

  try {
    const url = new URL(path, path.startsWith('http') ? path : `https://mistakes.local${path.startsWith('/') ? '' : '/'}${path}`);
    tags.forEach((tag) => {
      url.searchParams.append('tag', `${tag.key}:${tag.value}`);
    });
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
  } catch {
    const query = tags
      .map((tag) => `tag=${encodeURIComponent(`${tag.key}:${tag.value}`)}`)
      .join('&');
    if (!query) return path;
    return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
  }
}
