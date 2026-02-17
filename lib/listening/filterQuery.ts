// lib/listening/filterQuery.ts
import { z } from 'zod';
import { LevelZ, AccentZ } from '@/lib/validators/listening';
import type { Level, Accent } from '@/types/listening';

// Query shape: ?lvl=beginner&acc=us&top=maps,academic
const Q = z.object({
  lvl: LevelZ.optional(),
  acc: AccentZ.optional(),
  top: z.string().optional(), // comma-separated
});

export type FilterIn = {
  level?: Level;
  accent?: Accent;
  topics?: string[];
};

export function fromQuery(q: Record<string, any>): FilterIn {
  const parsed = Q.safeParse({
    lvl: q.lvl,
    acc: q.acc,
    top: q.top,
  });
  if (!parsed.success) return { topics: [] };

  const { lvl, acc, top } = parsed.data;
  const topics = top ? top.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return { level: lvl, accent: acc, topics };
}

export function toQuery(f: FilterIn): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.level) params.lvl = f.level;
  if (f.accent) params.acc = f.accent;
  if (f.topics && f.topics.length > 0) params.top = f.topics.join(',');
  return params;
}
