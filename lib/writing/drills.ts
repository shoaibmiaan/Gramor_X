import drills from '@/data/writing/drills/library.json';

export type DrillCheck =
  | { type: 'rewrite'; input: string; target: string }
  | { type: 'compare'; question: string; weak: string; strong: string }
  | { type: 'fill'; question: string; answer: string }
  | { type: 'timer'; durationSeconds: number; goal: string }
  | { type: 'ordering'; items: string[] }
  | { type: 'match'; pairs: [string, string][] }
  | { type: 'wordcount'; maxWords: number }
  | { type: 'reflection'; question: string; answer: string | null }
  | { type: 'checklist'; items: string[] };

export type Drill = {
  id: string;
  slug: string;
  title: string;
  criterion: 'TR' | 'CC' | 'LR' | 'GRA';
  durationMinutes: number;
  tags: string[];
  prompt: string;
  steps: string[];
  checks: DrillCheck[];
  takeaway: string;
};

const drillList: Drill[] = drills as Drill[];

export const allDrills = (): Drill[] => drillList;

export const findDrillBySlug = (slug: string): Drill | undefined =>
  drillList.find((drill) => drill.slug === slug);

export type DrillRecommendationOptions = {
  weakCriteria?: string[];
  tags?: string[];
  limit?: number;
};

export const recommendDrills = ({ weakCriteria, tags, limit = 4 }: DrillRecommendationOptions): Drill[] => {
  const normalizedWeak = (weakCriteria ?? []).map((value) => value.toUpperCase());
  const normalizedTags = (tags ?? []).map((value) => value.toLowerCase());

  const scored = drillList.map((drill) => {
    let score = 0;
    if (normalizedWeak.includes(drill.criterion.toUpperCase())) {
      score += 2;
    }
    if (drill.tags.some((tag) => normalizedTags.includes(tag.toLowerCase()))) {
      score += 1;
    }
    return { drill, score };
  });

  const sorted = scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.drill.durationMinutes !== b.drill.durationMinutes) {
        return a.drill.durationMinutes - b.drill.durationMinutes;
      }
      return a.drill.title.localeCompare(b.drill.title);
    })
    .map((item) => item.drill);

  const unique: Drill[] = [];
  const seen = new Set<string>();
  for (const drill of sorted) {
    if (seen.has(drill.id)) continue;
    seen.add(drill.id);
    unique.push(drill);
    if (unique.length >= limit) break;
  }

  if (unique.length < limit) {
    for (const drill of drillList) {
      if (seen.has(drill.id)) continue;
      unique.push(drill);
      seen.add(drill.id);
      if (unique.length >= limit) break;
    }
  }

  return unique.slice(0, limit);
};
