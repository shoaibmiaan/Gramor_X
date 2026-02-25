// lib/obs/slo.ts
// In-memory SLO tracker for API endpoints.

export type SloSample = {
  route: string;
  durationMs: number;
  status: number;
  targetMs: number;
};

type SloBucket = {
  durations: number[];
  statuses: number[];
  targetMs: number;
  lastUpdated: number;
};

const MAX_SAMPLES = 200;
const buckets = new Map<string, SloBucket>();

function percentile(values: number[], percentileRank: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1));
  return sorted[index];
}

export function recordSloSample(sample: SloSample) {
  const bucket = buckets.get(sample.route) ?? {
    durations: [],
    statuses: [],
    targetMs: sample.targetMs,
    lastUpdated: Date.now(),
  };

  bucket.durations.push(Math.max(0, sample.durationMs));
  bucket.statuses.push(sample.status);
  bucket.targetMs = sample.targetMs;
  bucket.lastUpdated = Date.now();

  if (bucket.durations.length > MAX_SAMPLES) bucket.durations.shift();
  if (bucket.statuses.length > MAX_SAMPLES) bucket.statuses.shift();

  buckets.set(sample.route, bucket);
}

export type SloSnapshot = {
  route: string;
  sampleCount: number;
  p95: number;
  targetMs: number;
  errorRate: number;
  lastUpdated: number;
};

export function getSloSnapshot(): SloSnapshot[] {
  return Array.from(buckets.entries()).map(([route, bucket]) => {
    const errors = bucket.statuses.filter((status) => status >= 500).length;
    const errorRate = bucket.statuses.length === 0 ? 0 : errors / bucket.statuses.length;
    return {
      route,
      sampleCount: bucket.durations.length,
      p95: percentile(bucket.durations, 95),
      targetMs: bucket.targetMs,
      errorRate,
      lastUpdated: bucket.lastUpdated,
    } satisfies SloSnapshot;
  });
}

export function isSloBreaching(route: string): boolean {
  const bucket = buckets.get(route);
  if (!bucket) return false;
  const p95 = percentile(bucket.durations, 95);
  return p95 > bucket.targetMs;
}

export function clearSloBuckets() {
  buckets.clear();
}

