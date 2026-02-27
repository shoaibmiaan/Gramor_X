import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeSuccessMetrics } from '../../lib/analytics/success-metrics';

describe('analytics/success-metrics', () => {
  it('aggregates funnel metrics and guardrail statuses', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const snapshot = computeSuccessMetrics({
      now,
      reviewEvents: [
        { userId: 'u1', event: 'open', occurredAt: '2025-01-15T08:00:00Z' },
        { userId: 'u1', event: 'complete', occurredAt: '2025-01-15T08:05:00Z' },
        { userId: 'u2', event: 'open', occurredAt: '2025-01-15T09:00:00Z' },
        { userId: 'u1', event: 'complete', occurredAt: '2025-01-14T10:00:00Z' },
        { userId: 'u1', event: 'complete', occurredAt: '2025-01-13T10:00:00Z' },
      ],
      wordsLearned: [
        { userId: 'u1', learnedOn: '2025-01-03' },
        { userId: 'u1', learnedOn: '2025-01-10' },
        { userId: 'u2', learnedOn: '2025-01-04' },
        { userId: 'u2', learnedOn: '2025-01-12' },
        { userId: 'u3', learnedOn: '2025-01-05' },
      ],
      assignments: [
        { userId: 'u1', variant: 'control' },
        { userId: 'u2', variant: 'variant-b' },
        { userId: 'u3', variant: 'variant-b' },
      ],
      collocationAttempts: [
        { userId: 'u1', attempts: 4, correct: 3, attemptedAt: '2024-12-30T09:00:00Z' },
        { userId: 'u1', attempts: 6, correct: 4, attemptedAt: '2025-01-10T09:00:00Z' },
      ],
    });

    assert.equal(snapshot.dauReviewCompletionRate, 0.5);
    assert.equal(snapshot.avgReviewsPerUserPerDay, 1);
    assert.equal(snapshot.wordsMasteredPerWeek, 1);

    assert.equal(snapshot.retention.baselineSample, 1); // control baseline size
    assert.equal(snapshot.retention.controlRate, 1);
    assert.equal(snapshot.retention.variantRate, 0.5);
    assert.equal(snapshot.retention.uplift, -0.5);

    assert.equal(snapshot.collocationAccuracy.recent, 4 / 6);
    assert.equal(snapshot.collocationAccuracy.previous, 3 / 4);
    assert.equal(snapshot.collocationAccuracy.delta, 4 / 6 - 3 / 4);

    const guardrailMap = new Map(snapshot.guardrails.map((g) => [g.metric, g.ok]));
    assert.equal(guardrailMap.get('Review completion rate'), false);
    assert.equal(guardrailMap.get('Reviews per user per day'), false);
    assert.equal(guardrailMap.get('7-day retention uplift'), false);
    assert.equal(guardrailMap.get('Words mastered per week'), false);
    assert.equal(guardrailMap.get('Collocation accuracy delta'), false);
  });
});
