// lib/listening/client.ts
import { z } from 'zod';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { ResourcePreview } from '@/types/listening';
import { ResourceFilterZ } from '@/lib/listening/repo';
import { ArticleZ, MediaZ, ExerciseZ } from '@/lib/validators/listening';

// Local normalize identical to server to keep the shape consistent
function normalize(rows: Array<{ kind: 'article' | 'audio' | 'video' | 'exercise'; row: any }>): ResourcePreview[] {
  const out: ResourcePreview[] = [];
  for (const item of rows) {
    if (item.kind === 'article') {
      const a = ArticleZ.pick({ id: true, slug: true, title: true, level: true, tags: true, created_at: true }).parse(item.row);
      out.push({
        id: a.id,
        kind: 'article',
        title: a.title,
        level: a.level,
        topics: a.tags ?? [],
        accent: 'mix',
        href: `/learn/listening/article/${a.slug}`,
        created_at: a.created_at,
      });
      continue;
    }
    if (item.kind === 'audio' || item.kind === 'video') {
      const m = MediaZ.pick({ id: true, kind: true, accent: true, level: true, tags: true, created_at: true }).parse(item.row);
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
      const e = ExerciseZ.pick({ id: true, level: true, tags: true, section: true, qtype: true, created_at: true }).parse(item.row);
      const title = `Exercise · Section ${e.section} · ${e.qtype.toUpperCase()}`;
      out.push({
        id: e.id,
        kind: 'exercise',
        title,
        level: e.level,
        topics: e.tags ?? [],
        accent: 'mix',
        href: `/learn/listening#exercise-${e.id}`,
        created_at: e.created_at,
      });
      continue;
    }
  }
  return out;
}

function applyTopics(q: any, topics?: string[]) {
  if (topics && topics.length > 0) return q.contains('tags', topics);
  return q;
}

/**
 * CLIENT entry — uses supabaseBrowser() and returns ResourcePreview[]
 */
export async function fetchListeningResourcesClient(input: unknown) {
  const supabase = supabaseBrowser();
  const f = ResourceFilterZ.parse(input);

  // Articles (published)
  let qa = supabase
    .from('listening_articles')
    .select('id, slug, title, level, tags, published, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1);

  if (f.level) qa = qa.eq('level', f.level);
  qa = applyTopics(qa, f.topics);
  const [a, aErr] = await qa.then(({ data, error }) => [data, error] as const);
  const articles = !aErr && a ? a.map((row) => ({ kind: 'article' as const, row })) : [];

  // Media (accent filter)
  let qm = supabase
    .from('listening_media')
    .select('id, kind, accent, level, tags, created_at')
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1);

  if (f.level) qm = qm.eq('level', f.level);
  if (f.accent) qm = qm.eq('accent', f.accent);
  qm = applyTopics(qm, f.topics);
  const [m, mErr] = await qm.then(({ data, error }) => [data, error] as const);
  const media = !mErr && m ? m.map((row) => ({ kind: (row.kind as 'audio' | 'video'), row })) : [];

  // Exercises
  let qe = supabase
    .from('listening_exercises')
    .select('id, section, qtype, level, tags, created_at')
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1);

  if (f.level) qe = qe.eq('level', f.level);
  qe = applyTopics(qe, f.topics);
  const [e, eErr] = await qe.then(({ data, error }) => [data, error] as const);
  const exercises = !eErr && e ? e.map((row) => ({ kind: 'exercise' as const, row })) : [];

  // Merge + sort
  const merged = normalize([...articles, ...media, ...exercises])
    .sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? ''));

  return merged.slice(0, f.limit);
}
