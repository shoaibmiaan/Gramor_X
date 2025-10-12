import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommendTasks, HistoryItem } from '../../lib/recommendations';

describe('recommendations', () => {
  const now = new Date('2024-01-01T00:00:00Z');

  it('prioritises tasks with the lowest scores', () => {
    const history: HistoryItem[] = [
      { taskId: 't1', score: 0.6, timestamp: now },
      { taskId: 't2', score: 0.2, timestamp: now },
      { taskId: 't3', score: 0.4, timestamp: now },
    ];
    const result = recommendTasks(history, ['t1', 't2', 't3']);
    assert.deepEqual(result.slice(0, 3), ['t2', 't3', 't1']);
  });

  it('keeps only the best (lowest) score for each task', () => {
    const history: HistoryItem[] = [
      { taskId: 't1', score: 0.9, timestamp: now },
      { taskId: 't1', score: 0.3, timestamp: now },
    ];
    const result = recommendTasks(history, ['t1']);
    assert.equal(result[0], 't1');
    // Ensure the better score was used
    assert.deepEqual(result, ['t1']);
  });

  it('appends unseen tasks to the end of the list', () => {
    const history: HistoryItem[] = [
      { taskId: 't1', score: 0.5, timestamp: now },
    ];
    const result = recommendTasks(history, ['t1', 't2', 't3']);
    assert.deepEqual(result.slice(1), ['t2', 't3']);
  });

  it('limits the number of returned tasks', () => {
    const history: HistoryItem[] = [
      { taskId: 't1', score: 0.1, timestamp: now },
      { taskId: 't2', score: 0.2, timestamp: now },
      { taskId: 't3', score: 0.3, timestamp: now },
    ];
    const result = recommendTasks(history, ['t1', 't2', 't3'], 2);
    assert.equal(result.length, 2);
  });

  it('handles empty history by returning catalog in order', () => {
    const result = recommendTasks([], ['t1', 't2']);
    assert.deepEqual(result, ['t1', 't2']);
  });
});
