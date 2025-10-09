// lib/analytics/progress.ts
// Helpers to aggregate progress analytics into weekly trends.

export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking';

export type BandRow = {
  attempt_date: string;
  skill: SkillKey | string;
  band: number | null;
};

export type TrendPoint = {
  weekStart: string;
} & Partial<Record<SkillKey, number>>;

export type SkillAverage = {
  skill: SkillKey;
  average: number;
  delta: number;
  samples: number;
};

export interface ProgressTrendPayload {
  timeline: TrendPoint[];
  perSkill: SkillAverage[];
  totalAttempts: number;
}

const SKILLS: SkillKey[] = ['reading', 'listening', 'writing', 'speaking'];

export function buildProgressTrends(rows: BandRow[]): ProgressTrendPayload {
  if (!rows || rows.length === 0) {
    return { timeline: [], perSkill: [], totalAttempts: 0 };
  }

  const weekMap = new Map<string, Map<SkillKey, { sum: number; count: number }>>();
  const totals = new Map<SkillKey, { sum: number; count: number }>();

  rows.forEach((row) => {
    const skill = normalizeSkill(row.skill);
    if (!skill) return;
    const band = typeof row.band === 'number' ? row.band : null;
    if (band == null || Number.isNaN(band)) return;

    const key = weekStart(row.attempt_date);
    if (!weekMap.has(key)) {
      weekMap.set(key, new Map());
    }
    const weekEntry = weekMap.get(key)!;
    const current = weekEntry.get(skill) ?? { sum: 0, count: 0 };
    weekEntry.set(skill, { sum: current.sum + band, count: current.count + 1 });

    const totalEntry = totals.get(skill) ?? { sum: 0, count: 0 };
    totals.set(skill, { sum: totalEntry.sum + band, count: totalEntry.count + 1 });
  });

  const timeline = Array.from(weekMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, data]) => {
      const point: TrendPoint = { weekStart: week };
      SKILLS.forEach((skill) => {
        const stats = data.get(skill);
        if (stats && stats.count > 0) {
          point[skill] = Number((stats.sum / stats.count).toFixed(2));
        }
      });
      return point;
    });

  const perSkill = SKILLS.map((skill) => {
    const total = totals.get(skill) ?? { sum: 0, count: 0 };
    const average = total.count > 0 ? total.sum / total.count : 0;

    const { current, previous } = weeklyAveragesForSkill(timeline, skill);
    const delta = current.count > 0 && previous.count > 0
      ? current.sum / current.count - previous.sum / previous.count
      : 0;

    return {
      skill,
      average: Number(average.toFixed(2)),
      delta: Number(delta.toFixed(2)),
      samples: total.count,
    };
  }).filter((entry) => entry.samples > 0);

  return {
    timeline,
    perSkill,
    totalAttempts: rows.length,
  };
}

function normalizeSkill(skill: string | SkillKey): SkillKey | null {
  const lower = skill?.toString().toLowerCase();
  return SKILLS.includes(lower as SkillKey) ? (lower as SkillKey) : null;
}

function weekStart(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const temp = new Date(utc);
  const day = temp.getUTCDay();
  const offset = (day + 6) % 7; // Monday = 0
  temp.setUTCDate(temp.getUTCDate() - offset);
  return temp.toISOString().slice(0, 10);
}

function weeklyAveragesForSkill(timeline: TrendPoint[], skill: SkillKey) {
  const last = timeline[timeline.length - 1];
  const prev = timeline.length > 1 ? timeline[timeline.length - 2] : undefined;

  const current = extractStats(last, skill);
  const previous = extractStats(prev, skill);

  return { current, previous };
}

function extractStats(point: TrendPoint | undefined, skill: SkillKey) {
  if (!point || point[skill] == null) {
    return { sum: 0, count: 0 };
  }
  return { sum: point[skill] as number, count: 1 };
}

export function formatWeekLabel(isoWeekStart: string): string {
  const date = new Date(isoWeekStart);
  if (Number.isNaN(date.getTime())) return isoWeekStart;
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${fmt.format(date)} – ${fmt.format(end)}`;
}
