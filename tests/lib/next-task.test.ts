import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { selectNextTask } from '../../lib/next-task';
import { HistoryItem } from '../../lib/recommendations';
import { Drill } from '../../lib/spaced-repetition';
import { Performance } from '../../lib/difficulty';

describe('next-task selection', () => {
  const history: HistoryItem[] = [
    { taskId: 'grammar-basics', score: 0.2, timestamp: new Date('2024-01-01') },
    { taskId: 'vocab-drill', score: 0.5, timestamp: new Date('2024-01-02') },
  ];
  const catalog = ['grammar-basics', 'vocab-drill', 'listening'];
  const performance: Performance = { level: 3, correct: 8, attempts: 10 };

  it('prefers remedial exercises derived from errors', async () => {
    const analytics = mock.fn();
    const choice = await selectNextTask({
      history,
      catalog,
      performance,
      errors: ['grammar'],
      drills: [],
      analytics,
    });
    assert.equal(choice, 'grammar-basics');
    assert.equal(analytics.mock.callCount(), 1);
  });

  it('falls back to due drills when no remedial exercises exist', async () => {
    const drills: Drill[] = [
      {
        id: 'drill-1',
        interval: 1,
        repetition: 1,
        ease: 2.5,
        due: new Date('2023-12-31T00:00:00Z'),
      },
    ];
    const choice = await selectNextTask({
      history,
      catalog,
      performance,
      errors: [],
      drills,
    });
    assert.equal(choice, 'drill-1');
  });

  it('returns general recommendation when nothing else matches', async () => {
    const choice = await selectNextTask({
      history,
      catalog,
      performance,
      errors: [],
      drills: [
        {
          id: 'drill-2',
          interval: 1,
          repetition: 1,
          ease: 2.5,
          due: new Date('2099-01-01T00:00:00Z'),
        },
      ],
    });
    assert.equal(choice, 'grammar-basics');
  });

  it('allows AI provider to override the choice', async () => {
    const ai = mock.fn(async () => ['ai-picked']);
    const choice = await selectNextTask({
      history,
      catalog,
      performance,
      errors: ['grammar'],
      drills: [],
      ai,
    });
    assert.equal(choice, 'ai-picked');
    assert.equal(ai.mock.callCount(), 1);
  });

  it('falls back gracefully when AI provider throws', async () => {
    const ai = mock.fn(async () => {
      throw new Error('network');
    });
    const choice = await selectNextTask({
      history,
      catalog,
      performance,
      errors: ['vocabulary'],
      drills: [],
      ai,
    });
    assert.equal(choice, 'vocab-drill');
  });
});
