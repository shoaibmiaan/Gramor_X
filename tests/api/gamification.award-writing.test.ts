import { strict as assert } from 'node:assert';
import { test, vi } from 'vitest';

const captured: Array<{ table: string; op: string; value: any }> = [];
const attemptId = '00000000-0000-0000-0000-000000000001';

const supabaseClient = {
  auth: {
    async getUser() {
      return { data: { user: { id: 'user-123' } }, error: null };
    },
  },
  from(table: string) {
    if (table === 'exam_attempts') {
      const attemptRow = {
        id: attemptId,
        user_id: 'user-123',
        started_at: '2024-03-01T00:00:00Z',
        submitted_at: '2024-03-01T00:50:00Z',
        duration_seconds: 3000,
        created_at: '2024-03-01T00:00:00Z',
      };
      return {
        select() {
          return {
            eq() {
              return this;
            },
            async maybeSingle() {
              return { data: attemptRow, error: null };
            },
          } as any;
        },
      } as any;
    }

    if (table === 'user_xp_events') {
      return {
        select() {
          return {
            eq() {
              return this;
            },
            async maybeSingle() {
              return { data: null, error: null };
            },
          } as any;
        },
        async insert(value: any) {
          captured.push({ table, op: 'insert', value });
          return { error: null };
        },
      } as any;
    }

    if (table === 'writing_responses') {
      const rows = [
        {
          exam_attempt_id: attemptId,
          overall_band: 6.5,
          band_scores: {
            task_response: 6,
            coherence_and_cohesion: 6,
            lexical_resource: 7,
            grammatical_range: 6,
          },
          submitted_at: '2024-03-01T00:50:00Z',
          created_at: '2024-03-01T00:50:00Z',
        },
        {
          exam_attempt_id: '00000000-0000-0000-0000-000000000000',
          overall_band: 6.0,
          band_scores: {
            task_response: 6,
            coherence_and_cohesion: 6,
            lexical_resource: 6,
            grammatical_range: 6,
          },
          submitted_at: '2024-02-01T00:45:00Z',
          created_at: '2024-02-01T00:45:00Z',
        },
      ];
      return {
        select() {
          return {
            eq() {
              return this;
            },
            order() {
              return this;
            },
            limit: async () => ({ data: rows, error: null }),
          } as any;
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
        return {
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: null, error: null };
          },
        } as any;
      },
    } as any;
  },
};

vi.mock('../../lib/supabaseServer', () => ({
  getServerClient: () => supabaseClient,
}));

const buildResponse = () => {
  let statusCode: number | undefined;
  let payload: any;
  return {
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
    get statusCode() {
      return statusCode;
    },
    get jsonPayload() {
      return payload;
    },
  } as any;
};

test('awards xp for writing attempt', async () => {
  captured.length = 0;
  const req = { method: 'POST', body: { attemptId } } as any;
  const res = buildResponse();
  const { default: handler } = await import('../../pages/api/gamification/award-writing');

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonPayload?.ok, true);
  assert.ok(res.jsonPayload?.points > 0);
  assert.ok(captured.some((entry) => entry.table === 'user_xp_events'));
});
