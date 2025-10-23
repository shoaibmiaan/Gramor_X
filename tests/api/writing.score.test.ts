import { strict as assert } from 'node:assert';
import { test, vi } from 'vitest';

const supabaseStub = (() => {
  const captured: Array<{ table: string; op: string; value: any }> = [];
  const autosaveResponse = { data: null, error: null };
  return {
    captured,
    client: {
      auth: {
        async getUser() {
          return { data: { user: { id: 'user-123' } }, error: null };
        },
      },
      from(table: string) {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          async insert(value: any) {
            captured.push({ table, op: 'insert', value });
            return { error: null };
          },
          async upsert(value: any) {
            captured.push({ table, op: 'upsert', value });
            return { error: null };
          },
        } as any;
      },
    },
    reset() {
      captured.length = 0;
    },
  };
})();

vi.mock('../../lib/supabaseServer', () => ({
  getServerClient: () => supabaseStub.client,
}));

test('scores an essay and persists records', async () => {
  supabaseStub.reset();

  const req = {
    method: 'POST',
    body: {
      attemptId: '11111111-1111-1111-1111-111111111111',
      essay:
        'This is a sample essay containing more than twenty words to ensure the scoring heuristic works as expected in our tests. It highlights structure and vocabulary.',
      task: 'task2',
    },
  } as any;

  let statusCode: number | undefined;
  let payload: any;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      payload = body;
      return body;
    },
    setHeader() {
      return undefined;
    },
  } as any;

  const { default: handler } = await import('../../pages/api/ai/writing/score-v1');

  await handler(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload?.ok, true);
  assert.ok(payload?.result?.overallBand > 0);
  assert.equal(supabaseStub.captured.filter((entry) => entry.table === 'writing_responses').length, 1);
  assert.equal(supabaseStub.captured.filter((entry) => entry.table === 'exam_events').length, 1);
});
