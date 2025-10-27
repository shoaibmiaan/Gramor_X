import test from 'node:test';
import assert from 'node:assert/strict';

import handler, {
  __setAnalyticsWritingOverviewTestOverrides as setOverviewTestOverrides,
  __resetAnalyticsWritingOverviewTestOverrides as resetOverviewTestOverrides,
  __clearAnalyticsWritingOverviewCache as clearOverviewCache,
} from '../../pages/api/analytics/writing/overview';

const rows = [
  {
    id: 'resp-1',
    exam_attempt_id: 'attempt-1',
    overall_band: 6,
    band_scores: {
      task_response: 6,
      coherence_and_cohesion: 6,
      lexical_resource: 6,
      grammatical_range: 6,
      overall: 6,
    },
    word_count: 320,
    duration_seconds: 1800,
    submitted_at: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T12:00:00Z',
  },
  {
    id: 'resp-2',
    exam_attempt_id: 'attempt-1',
    overall_band: 6.5,
    band_scores: {
      task_response: 6.5,
      coherence_and_cohesion: 6.5,
      lexical_resource: 6.5,
      grammatical_range: 6.5,
      overall: 6.5,
    },
    word_count: 340,
    duration_seconds: 1750,
    submitted_at: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T12:00:00Z',
  },
  {
    id: 'resp-3',
    exam_attempt_id: 'attempt-2',
    overall_band: 7,
    band_scores: {
      task_response: 7,
      coherence_and_cohesion: 7,
      lexical_resource: 7,
      grammatical_range: 7,
      overall: 7,
    },
    word_count: 360,
    duration_seconds: 1900,
    submitted_at: '2024-01-08T12:00:00Z',
    created_at: '2024-01-08T12:00:00Z',
  },
];

let queryCount = 0;

const queryBuilder = {
  select() {
    return this;
  },
  eq() {
    return this;
  },
  not() {
    return this;
  },
  gte() {
    return this;
  },
  order() {
    return this;
  },
  async limit(..._args: any[]) {
    queryCount += 1;
    if (queryCount > 1) {
      throw new Error('should not query when cached');
    }
    return { data: rows, error: null };
  },
};

function createResponse() {
  let statusCode = 0;
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
}

test('overview API aggregates metrics and caches responses', async (t) => {
  const req = { method: 'GET', query: {} } as any;
  const res1 = createResponse();

  clearOverviewCache();
  queryCount = 0;
  setOverviewTestOverrides({
    getClient: () => ({
      auth: {
        async getUser() {
          return { data: { user: { id: 'user-123' } }, error: null };
        },
      },
      from() {
        return queryBuilder as any;
      },
    }) as any,
  });

  t.after(() => {
    resetOverviewTestOverrides();
    clearOverviewCache();
  });

  await handler(req, res1);

  assert.equal(res1.statusCode, 200);
  assert.equal(res1.jsonPayload?.ok, true);
  assert.equal(res1.jsonPayload?.overview?.totalAttempts, 2);
  assert.equal(res1.jsonPayload?.overview?.totalWords, 1020);
  assert.equal(res1.jsonPayload?.overview?.averageWordCount, 510);
  assert.equal(res1.jsonPayload?.weekly?.points?.length, 2);
  assert.equal(res1.jsonPayload?.cached, undefined);

  const res2 = createResponse();
  await handler(req, res2);

  assert.equal(res2.statusCode, 200);
  assert.equal(res2.jsonPayload?.ok, true);
  assert.equal(res2.jsonPayload?.cached, true);
  assert.equal(res2.jsonPayload?.overview?.totalAttempts, 2);
});
