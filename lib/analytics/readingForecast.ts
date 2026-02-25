// lib/analytics/readingForecast.ts
// Least-squares on last N sessions, with guards. No deps.

export type TrendPoint = { date: string; score: number }; // score 0..1
export type Forecast = {
  targetBand: number;
  etaDays: number | null; // null if not reachable from current slope
  confidence: 'low' | 'med' | 'high';
  rationale: string;
  targetPct: number; // 0..1
  slopePctPerDay: number; // signed
};

const pctToBand = (p: number) => {
  const x = p * 100;
  if (x <= 35) return 5.0;
  if (x <= 55) return 6.0;
  if (x <= 72) return 7.0;
  if (x <= 88) return 7.5;
  if (x <= 95) return 8.0;
  return 8.5;
};

const bandToPct = (b: number) => {
  // inverse of coarse mapping (piecewise midpoints)
  if (b <= 5) return 0.30;
  if (b <= 6) return 0.50;
  if (b <= 7) return 0.70;
  if (b <= 7.5) return 0.82;
  if (b <= 8) return 0.90;
  return 0.95;
};

export function regressETA(points: TrendPoint[], targetBand = 7.0): Forecast {
  const pts = (points ?? []).slice(-30).filter(p => Number.isFinite(p.score));
  if (pts.length < 5) {
    const cur = pts.at(-1)?.score ?? 0.6;
    return {
      targetBand,
      etaDays: null,
      confidence: 'low',
      rationale: 'Not enough history; keep logging sessions.',
      targetPct: bandToPct(targetBand),
      slopePctPerDay: 0,
    };
  }

  // x = days since first, y = score (0..1)
  const t0 = new Date(pts[0].date).getTime();
  const xy = pts.map((p) => ({
    x: (new Date(p.date).getTime() - t0) / (1000 * 60 * 60 * 24),
    y: Math.max(0, Math.min(1, p.score)),
  }));

  const n = xy.length;
  const sx = xy.reduce((a, v) => a + v.x, 0);
  const sy = xy.reduce((a, v) => a + v.y, 0);
  const sxx = xy.reduce((a, v) => a + v.x * v.x, 0);
  const sxy = xy.reduce((a, v) => a + v.x * v.y, 0);
  const denom = n * sxx - sx * sx || 1;

  const slope = (n * sxy - sx * sy) / denom;   // per day (0..1 units)
  const intercept = (sy - slope * sx) / n;

  const cur = xy[xy.length - 1]?.y ?? 0.6;
  const tgt = bandToPct(targetBand);

  const slopePctPerDay = slope; // same units
  let etaDays: number | null = null;
  if (slope > 0 && tgt > cur) etaDays = Math.ceil((tgt - cur) / slope);
  if (slope <= 0 && tgt > cur) etaDays = null;

  const variance =
    xy.reduce((a, v) => a + Math.pow(v.y - (slope * v.x + intercept), 2), 0) / n;
  const conf = variance < 0.002 ? 'high' : variance < 0.008 ? 'med' : 'low';

  return {
    targetBand,
    etaDays,
    confidence: conf,
    rationale:
      etaDays === null
        ? 'Trajectory is flat/declining; focus weaker types to change slope.'
        : `Slope ${(slope * 100).toFixed(2)}%/day from ${Math.round(n)} sessions.`,
    targetPct: tgt,
    slopePctPerDay: slopePctPerDay,
  };
}

export const deriveBand = (scorePct0to1: number) => pctToBand(scorePct0to1);
