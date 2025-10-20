// scripts/snapshot_xp_leaderboard.ts
// Usage: npx tsx scripts/snapshot_xp_leaderboard.ts
// Aggregates user XP events into daily & weekly leaderboard snapshots.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_TOKEN;

if (!url || !key) {
  throw new Error('Missing Supabase URL or service role key for leaderboard snapshot script.');
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TIME_ZONE = 'Asia/Karachi';

type EventRow = { user_id: string; xp: number; created_at: string };

type AggregateMap = Map<string, number>;

type Scope = 'daily' | 'weekly';

type SnapshotRow = { user_id: string; xp: number };

function startOfDay(now: DateTime) {
  return now.startOf('day');
}

function startOfNextMonday(now: DateTime) {
  const weekday = now.weekday; // 1 = Monday ... 7 = Sunday
  const daysUntilNextMonday = weekday === 1 ? 7 : (8 - weekday);
  return now.plus({ days: daysUntilNextMonday }).startOf('day');
}

function startOfCurrentWeek(now: DateTime) {
  const weekday = now.weekday;
  const daysFromMonday = weekday - 1; // Monday = 1
  return now.minus({ days: daysFromMonday }).startOf('day');
}

async function loadEvents(since: DateTime): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('user_xp_events')
    .select('user_id, xp, created_at')
    .gte('created_at', since.toUTC().toISO());

  if (error) throw error;
  return (data ?? []) as EventRow[];
}

function aggregate(rows: EventRow[], since: DateTime): AggregateMap {
  const map: AggregateMap = new Map();
  const cutoff = since.toUTC().toMillis();
  for (const row of rows) {
    const ts = DateTime.fromISO(row.created_at).toUTC().toMillis();
    if (Number.isNaN(ts) || ts < cutoff) continue;
    const previous = map.get(row.user_id) ?? 0;
    map.set(row.user_id, previous + row.xp);
  }
  return map;
}

function toSnapshotRows(map: AggregateMap): SnapshotRow[] {
  return Array.from(map.entries())
    .map(([user_id, xp]) => ({ user_id, xp }))
    .sort((a, b) => b.xp - a.xp);
}

async function persist(scope: Scope, snapshotDate: DateTime, rows: SnapshotRow[]) {
  const isoDate = snapshotDate.toISODate();

  await supabase
    .from('xp_leaderboard_entries')
    .delete()
    .eq('scope', scope)
    .eq('snapshot_date', isoDate);

  if (rows.length === 0) return;

  const payload = rows.slice(0, 100).map((row, index) => ({
    scope,
    snapshot_date: isoDate,
    user_id: row.user_id,
    xp: row.xp,
    rank: index + 1,
  }));

  const { error } = await supabase.from('xp_leaderboard_entries').insert(payload);
  if (error) throw error;
}

async function run() {
  const now = DateTime.now().setZone(TIME_ZONE);
  const dayStart = startOfDay(now);
  const weekStart = startOfCurrentWeek(now);

  const eventsSinceWeekStart = await loadEvents(weekStart);
  const dailyEvents = eventsSinceWeekStart.filter((row) =>
    DateTime.fromISO(row.created_at).setZone(TIME_ZONE) >= dayStart,
  );

  const weeklyMap = aggregate(eventsSinceWeekStart, weekStart);
  const dailyMap = aggregate(dailyEvents, dayStart);

  await persist('weekly', weekStart, toSnapshotRows(weeklyMap));
  await persist('daily', dayStart, toSnapshotRows(dailyMap));

  const nextMonday = startOfNextMonday(now);
  console.log(
    `[snapshot] Captured ${dailyMap.size} users for daily (${dayStart.toISODate()}) and ${weeklyMap.size} users for weekly (${weekStart.toISODate()}). Next weekly reset: ${nextMonday.toISO()}`,
  );
}

run().catch((err) => {
  console.error('[snapshot] Failed to update leaderboard:', err);
  process.exit(1);
});
