import test from 'node:test';
import assert from 'node:assert/strict';

import type { PlanGuardContext } from '@/lib/api/withPlan';
import { writingExportHandler } from '@/pages/api/writing/export/pdf';

const supabaseStub = {
  from(table: string) {
    if (table === 'exam_attempts') {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: { id: 'a1', user_id: 'user-1' }, error: null };
        },
      } as any;
    }
    if (table === 'writing_responses') {
      return {
        select() {
          return this;
        },
        eq() {
          return {
            data: [
              { task: 'task1', overall_band: 6.5, feedback: { summary: 'Solid Task 1.' } },
              { task: 'task2', overall_band: 7.0, feedback: { summary: 'Great Task 2.' } },
            ],
            error: null,
          };
        },
      } as any;
    }
    return {
      select() {
        return this;
      },
      eq() {
        return { data: null, error: null };
      },
    } as any;
  },
};

const buildRes = () => {
  const headers: Record<string, string> = {};
  return {
    statusCode: 0,
    body: null as any,
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.body = payload;
    },
    json(payload: any) {
      this.body = payload;
      return payload;
    },
    get headers() {
      return headers;
    },
  } as any;
};

test('writing export pdf handler returns pdf buffer', async () => {
  const req = { method: 'GET', query: { attemptId: 'a1' } } as any;
  const res = buildRes();
  const ctx: PlanGuardContext = {
    user: { id: 'user-1' } as any,
    plan: 'booster',
    role: 'admin',
    supabase: supabaseStub as any,
    audience: { plan: 'booster', role: 'admin', userId: 'user-1' },
    flags: { writingExports: true } as any,
  };

  await writingExportHandler(req, res, ctx);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.equal(Buffer.isBuffer(res.body), true);
});
