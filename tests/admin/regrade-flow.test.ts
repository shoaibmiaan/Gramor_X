import test from 'node:test';
import assert from 'node:assert/strict';

import type { PlanGuardContext } from '@/lib/api/withPlan';
import { regradeHandler } from '@/pages/api/admin/writing/regrade';

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
        update() {
          return {
            eq() {
              return { data: null, error: null };
            },
          };
        },
      } as any;
    }
    if (table === 'exam_events') {
      return {
        async insert() {
          return { error: null };
        },
      } as any;
    }
    return {
      select() {
        return this;
      },
      eq() {
        return { maybeSingle: async () => ({ data: null, error: null }) } as any;
      },
    } as any;
  },
};

const buildRes = () => {
  return {
    statusCode: 0,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return payload;
    },
  } as any;
};

test('queues regrade successfully', async () => {
  const req = { method: 'POST', body: { attemptId: '00000000-0000-0000-0000-000000000001' } } as any;
  const res = buildRes();
  const ctx: PlanGuardContext = {
    user: { id: 'admin-1' } as any,
    plan: 'master',
    role: 'admin',
    supabase: supabaseStub as any,
    audience: { plan: 'master', role: 'admin', userId: 'admin-1' },
    flags: { killSwitchWriting: false } as any,
  };

  await regradeHandler(req, res, ctx, supabaseStub as any);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
});
