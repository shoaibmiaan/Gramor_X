// lib/listening/repo.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  Level, Accent, ResourcePreview, ResourceKind,
} from '@/types/listening';
import {
  ArticleZ, MediaZ, ExerciseZ, LevelZ, AccentZ,
} from '@/lib/validators/listening';

// Query input
export const ResourceFilterZ = z.object({
  level: LevelZ.optional(),
  topics: z.array(z.string()).optional(),
  accent: AccentZ.optional(),
  limit: z.number().int().positive().max(100).default(30),
  offset: z.number().int().nonnegative().default(0),
});
export type ResourceFilter = z.infer<typeof ResourceFilterZ>;

type SB = SupabaseClient<any, 'public', any>;

/** Normalize records from different tables into ResourcePreview */
function normalize(
  rows: Array<{ kind: ResourceKind; row: any }>
): ResourcePreview[] {
  const out: ResourcePreview[] = [];
  for (const item of rows) {
    if (item.kind === 'article') {
      const a = ArticleZ.pick({
        id: true, slug: true, title: true, level: true, tags: true, created_at: true,
      }).parse(item.row);
      out.push({
        id: a.id,
        kind: 'article',
        title: a.title,
        level: a.level,
        topics: a.tags ?? [],
        accent: 'mix',
        href: `/learn/listening/article/${a.slug}`, // detail route to be created later
        created_at: a.created_at,
      });
      continue;
    }

    if (item.kind === 'audio' || item.kind === 'video') {
      const m = MediaZ.pick({
        id: true, kind: true, accent: true, level: true, tags: true, created_at: true,
      }).parse(item.row);
      const title = `${m.kind === 'audio' ? 'Audio' : 'Video'} (${m.accent.toUpperCase()}) — ${m.level}`;
      out.push({
        id: m.id,
        kind: m.kind,
        title,
        level: m.level,
        topics: m.tags ?? [],
        accent: m.accent,
        href: `/learn/listening#media-${m.id}`,
        created_at: m.created_at,
      });
      continue;
    }

    if (item.kind === 'exercise') {
      const e = ExerciseZ.pick({
        id: true, level: true, tags: true, section: true, qtype: true, created_at: true,
      }).parse(item.row);
      const title = `Exercise · Section ${e.section} · ${e.qtype.toUpperCase()}`;
      out.push({
        id: e.id,
        kind: 'exercise',
        title,
        level: e.level,
        topics: e.tags ?? [],
        accent: 'mix', // exercise-level accent varies via linked media; preview uses 'mix'
        href: `/learn/listening#exercise-${e.id}`,
        created_at: e.created_at,
      });
      continue;
    }
  }
  return out;
}

/** Build topic filter: tags @> topics[] if provided */
function applyTopics(q: any, topics?: string[]) {
  if (topics && topics.length > 0) {
    return q.contains('tags', topics);
  }
  return q;
}

/** SERVER: fetch published articles (accent ignored) */
async function getArticles(supabase: SB, f: ResourceFilter) {
  let q = supabase
    .from('listening_articles')
    .select('id, slug, title, level, tags, published, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1);

  if (f.level) q = q.eq('level', f.level);
  q = applyTopics(q, f.topics);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((row) => ({ kind: 'article' as const, row }));
}

/** SERVER: fetch media (accent respected) */
async function getMedia(supabase: SB, f: ResourceFilter) {
  let q = supabase
    .from('listening_media')
    .select('id, kind, accent, level, tags, created_at')
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1);

  if (f.level) q = q.eq('level', f.level);
  if (f.accent) q = q.eq('accent', f.accent);
  q = applyTopics(q, f.topics);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((row) => ({ kind: (row.kind as ResourceKind), row }));
}

/** SERVER: fetch exercises (accent ignored at preview level) */
async function getExercises(supabase: SB, f: ResourceFilter) {
  let q = supabase
    .from('listening_exercises')
    .select('id, section, qtype, level, tags, created_at')
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1);

  if (f.level) q = q.eq('level', f.level);
  q = applyTopics(q, f.topics);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((row) => ({ kind: 'exercise' as const, row }));
}

/**
 * SERVER entry — returns normalized resource previews for SSR.
 * Notes:
 * - Accent filter applies to media; articles/exercises are included regardless of accent.
 * - Use pagination via limit/offset (default 30/0).
 */
export async function fetchListeningResourcesServer(
  supabase: SB,
  filter: Partial<ResourceFilter>
): Promise<ResourcePreview[]> {
  const f = ResourceFilterZ.parse(filter);
  const [a, m, e] = await Promise.all([
    getArticles(supabase, f),
    getMedia(supabase, f),
    getExercises(supabase, f),
  ]);

  // Merge and sort by created_at desc (null-safe)
  const merged = normalize([...a, ...m, ...e])
    .sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? ''));

  // Limit final merged set to f.limit (soft cap)
  return merged.slice(0, f.limit);
}
