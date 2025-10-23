import { strict as assert } from 'node:assert';
import { test, vi } from 'vitest';

const supabaseStub = (() => {
  const captured: Array<{ table: string; op: string; value: any }> = [];

  const makeFilterBuilder = (rows: any[] = []) => {
    return {
      eq() {
        return this;
      },
      in() {
        return this;
      },
      not() {
        return this;
      },
      order() {
        return this;
      },
      limit: async () => ({ data: rows, error: null }),
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    } as any;
  };

  return {
    captured,
    client: {
      auth: {
        async getUser() {
          return { data: { user: { id: 'user-123' } }, error: null };
        },
      },
      from(table: string) {
        if (table === 'writing_prompts') {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            async maybeSingle() {
              return { data: { word_target: 250, task_type: 'task2' }, error: null };
            },
          } as any;
        }

        if (table === 'writing_responses') {
          return {
            select() {
              return makeFilterBuilder([]);
            },
            upsert(value: any) {
              captured.push({ table, op: 'upsert', value });
              return {
                select() {
                  return {
                    async maybeSingle() {
                      return { data: { id: 'response-1' }, error: null };
                    },
                  };
                },
              } as any;
            },
          } as any;
        }

        if (table === 'writing_feedback') {
          return {
            async upsert(value: any) {
              captured.push({ table, op: 'upsert', value });
              return { error: null };
            },
          } as any;
        }

        if (table === 'exam_events') {
          return {
            async insert(value: any) {
              captured.push({ table, op: 'insert', value });
              return { error: null };
            },
          } as any;
        }

        return {
          select() {
            return makeFilterBuilder();
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

const buildRes = () => {
  let statusCode: number | undefined;
  let payload: any;
  return {
    get statusCode() {
      return statusCode;
    },
    get jsonPayload() {
      return payload;
    },
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
};

test('score-v2 enriches essay response with rewrite and highlights', async () => {
  supabaseStub.reset();
  const req = {
    method: 'POST',
    body: {
      attemptId: '00000000-0000-0000-0000-000000000001',
      essay:
        'This essay repeats the word very very often. It also lacks proper punctuation and has tiny paragraphs. we try to see.',
      task: 'task2',
    },
  } as any;

  const res = buildRes();
  const { default: handler } = await import('../../pages/api/ai/writing/score-v2');

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonPayload?.ok, true);
  assert.ok(res.jsonPayload?.result?.feedback?.band9Rewrite?.length > 0);
  assert.ok(Array.isArray(res.jsonPayload?.result?.feedback?.errors));
  assert.ok(supabaseStub.captured.some((entry) => entry.table === 'writing_feedback'));
  assert.ok(supabaseStub.captured.some((entry) => entry.table === 'exam_events'));
});
