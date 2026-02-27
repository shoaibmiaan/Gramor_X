import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calibrateDifficulty, Performance } from '../../lib/difficulty';

describe('difficulty calibration', () => {
  const base: Performance = { level: 5, correct: 0, attempts: 0 };

  it('raises level when accuracy exceeds 85%', () => {
    const result = calibrateDifficulty({ ...base, level: 3, correct: 9, attempts: 10 });
    assert.equal(result, 4);
  });

  it('lowers level when accuracy drops below 60%', () => {
    const result = calibrateDifficulty({ ...base, level: 3, correct: 2, attempts: 5 });
    assert.equal(result, 2);
  });

  it('keeps level when accuracy is between thresholds', () => {
    const result = calibrateDifficulty({ ...base, level: 3, correct: 7, attempts: 10 });
    assert.equal(result, 3);
  });

  it('handles zero attempts by lowering to minimum', () => {
    const result = calibrateDifficulty({ ...base, level: 2 });
    assert.equal(result, 1);
  });

  it('clamps the level within provided bounds', () => {
    const maxed = calibrateDifficulty({ ...base, level: 10, correct: 10, attempts: 10 }, 1, 10);
    const mined = calibrateDifficulty({ ...base, level: 1, correct: 0, attempts: 10 }, 1, 10);
    assert.equal(maxed, 10);
    assert.equal(mined, 1);
  });
});
