import { strict as assert } from 'node:assert';
import { beforeEach, test, vi } from 'vitest';

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

const applyRateLimitMock = vi.fn();
vi.mock('@/lib/limits/rate', () => ({
  applyRateLimit: applyRateLimitMock,
}));

const recordSloSampleMock = vi.fn();
vi.mock('@/lib/obs/slo', () => ({
  recordSloSample: recordSloSampleMock,
}));

const createRequestLoggerMock = vi.fn(() => {
  const logger: any = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => logger),
  };
  return logger;
});
vi.mock('@/lib/obs/logger', () => ({
  createRequestLogger: createRequestLoggerMock,
}));

vi.mock('@/lib/api/withPlan', () => ({
  withPlan: (_plan: string, handler: any) => {
    return (req: any, res: any) =>
      handler(req, res, {
        user: { id: 'user-123' } as any,
        plan: 'starter',
        role: 'student',
        supabase: supabaseStub.client as any,
        audience: { plan: 'starter', role: 'student', userId: 'user-123' },
      });
  },
}));

const buildRes = () => {
  let statusCode: number | undefined;
  let payload: any;
  const headers: Record<string, string> = {};
  return {
    get statusCode() {
      return statusCode;
    },
    get jsonPayload() {
      return payload;
    },
    headers,
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      payload = body;
      return body;
    },
    setHeader(key: string, value: string) {
      headers[key] = String(value);
      return undefined;
    },
  } as any;
};

beforeEach(() => {
  supabaseStub.reset();
  applyRateLimitMock.mockReset();
  applyRateLimitMock.mockResolvedValue({ blocked: false, remaining: 11, retryAfter: 0, hits: 1 });
  recordSloSampleMock.mockReset();
  createRequestLoggerMock.mockClear();
});

test('score-v2 enriches essay response with rewrite and highlights', async () => {
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.5' },
    socket: { remoteAddress: '127.0.0.1' },
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
  assert.equal(res.headers['X-RateLimit-Limit'], '12');
  assert.equal(res.headers['X-RateLimit-Remaining'], '11');
  assert.equal(applyRateLimitMock.mock.calls[0]?.[0]?.identifier, 'user:user-123:ip:203.0.113.5');
  assert.ok(recordSloSampleMock.mock.calls.some((call) => call[0]?.status === 200));
});

test('score-v2 returns 429 when rate limit exceeded', async () => {
  applyRateLimitMock.mockResolvedValueOnce({ blocked: true, remaining: 0, retryAfter: 7, hits: 15 });

  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': '198.51.100.9' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {
      attemptId: 'attempt-rate-limit',
      essay: 'A short essay that will not be processed because of rate limits.',
      task: 'task1',
    },
  } as any;

  const res = buildRes();
  const { default: handler } = await import('../../pages/api/ai/writing/score-v2');

  await handler(req, res);

  assert.equal(res.statusCode, 429);
  assert.equal(res.jsonPayload?.error, 'Too many requests');
  assert.equal(res.jsonPayload?.retryAfter, 7);
  assert.equal(res.headers['Retry-After'], '7');
  assert.equal(res.headers['X-RateLimit-Remaining'], '0');
  assert.equal(supabaseStub.captured.length, 0);
  assert.ok(recordSloSampleMock.mock.calls.some((call) => call[0]?.status === 429));
});
