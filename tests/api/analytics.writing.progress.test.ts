import { strict as assert } from 'node:assert';
import { test, vi } from 'vitest';

const stubData = [
  {
    exam_attempt_id: 'attempt-1',
    overall_band: 6,
    band_scores: {
      task_response: 6,
      coherence_and_cohesion: 6,
      lexical_resource: 6,
      grammatical_range: 6,
    },
    submitted_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    exam_attempt_id: 'attempt-2',
    overall_band: 7,
    band_scores: {
      task_response: 7,
      coherence_and_cohesion: 7,
      lexical_resource: 7,
      grammatical_range: 7,
    },
    submitted_at: '2024-02-01T00:00:00Z',
    created_at: '2024-02-01T00:00:00Z',
  },
];

vi.mock('../../lib/supabaseServer', () => ({
  getServerClient: () => ({
    auth: {
      async getUser() {
        return { data: { user: { id: 'user-123' } }, error: null };
      },
    },
    from(table: string) {
      if (table === 'writing_responses') {
        return {
          select() {
            return {
              eq() {
                return this;
              },
              not() {
                return this;
              },
              order() {
                return this;
              },
              limit: async () => ({ data: stubData, error: null }),
            } as any;
          },
        } as any;
      }

      return {
        select() {
          return {
            eq() {
              return this;
            },
            maybeSingle: async () => ({ data: null, error: null }),
          } as any;
        },
      } as any;
    },
  }),
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

test('progress API aggregates attempts', async () => {
  const req = { method: 'GET' } as any;
  const res = buildResponse();
  const { default: handler } = await import('../../pages/api/analytics/writing/progress');

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonPayload?.ok, true);
  assert.equal(res.jsonPayload?.points?.length, 2);
  assert.ok(res.jsonPayload?.deltas?.length > 0);
});
