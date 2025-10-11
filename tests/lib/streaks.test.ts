import assert from 'node:assert/strict';
import test from 'node:test';
import { computeStreakUpdate, dayKey, syncStreak } from '@/lib/streaks';

test('dayKey respects timezone behind UTC across calendar boundary', () => {
  const date = new Date('2024-01-01T03:30:00Z');
  const key = dayKey(date, 'America/Los_Angeles');
  assert.equal(key, '2023-12-31');
});

test('dayKey handles DST forward shift without skipping day', () => {
  const date = new Date('2024-03-10T06:30:00Z');
  const key = dayKey(date, 'America/New_York');
  assert.equal(key, '2024-03-10');
});

test('computeStreakUpdate increments over DST transition', () => {
  const now = new Date('2024-03-11T05:00:00Z');
  const result = computeStreakUpdate({
    now,
    tz: 'America/New_York',
    row: { current_streak: 5, last_activity_date: '2024-03-10' },
  });
  assert.equal(result.current, 6);
  assert.equal(result.reason, 'incremented');
  assert.equal(result.todayKey, '2024-03-11');
});

test('syncStreak only updates requesting user row and logs correction', async () => {
  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  try {
    const stub = createSupabaseStub({
      user_id: 'user-1',
      current_streak: 2,
      last_activity_date: '2024-03-09',
    });

    const fixedNow = new Date('2024-03-10T23:30:00-04:00');
    const next = await syncStreak(stub as any, 'user-1', 'America/New_York', fixedNow);
    assert.equal(next, 3);

    assert.deepEqual(stub.selectCalls, [{ table: 'user_streaks', column: 'user_id', value: 'user-1' }]);
    assert.equal(stub.upsertCalls.length, 1);
    const upsert = stub.upsertCalls[0];
    assert.equal(upsert.table, 'user_streaks');
    assert.deepEqual(upsert.payload, {
      user_id: 'user-1',
      current_streak: 3,
      last_activity_date: '2024-03-10',
    });
    assert.equal(logs.length, 1);
    assert.match(logs[0], /"userId":"user-1"/);
    assert.match(logs[0], /"reason":"incremented"/);
  } finally {
    console.info = originalInfo;
  }
});

type StubRow = {
  user_id: string;
  current_streak: number;
  last_activity_date: string | null;
};

type SelectCall = { table: string; column: string; value: string };

type UpsertCall = { table: string; payload: any };

function createSupabaseStub(row: StubRow | null) {
  return {
    selectCalls: [] as SelectCall[],
    upsertCalls: [] as UpsertCall[],
    from(table: string) {
      const parent = this;
      return {
        _filter: null as null | { column: string; value: string },
        select() {
          return this;
        },
        eq(column: string, value: string) {
          parent.selectCalls.push({ table, column, value });
          this._filter = { column, value };
          return this;
        },
        async maybeSingle() {
          if (!this._filter || !row || row.user_id !== this._filter.value) {
            return { data: null, error: null };
          }
          return { data: { current_streak: row.current_streak, last_activity_date: row.last_activity_date }, error: null };
        },
        async upsert(payload: any) {
          parent.upsertCalls.push({ table, payload });
          return { data: null, error: null };
        },
      };
    },
  };
}
