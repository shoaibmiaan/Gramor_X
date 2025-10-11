import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tagErrors, mapToRemedialExercises, remediationMap } from '../../lib/error-mapping';

describe('error-mapping', () => {
  it('counts occurrences of each error tag', () => {
    const counts = tagErrors(['grammar', 'grammar', 'vocabulary']);
    assert.deepEqual(counts, { grammar: 2, vocabulary: 1 });
  });

  it('maps known error tags to remedial exercises', () => {
    const exercises = mapToRemedialExercises(['grammar', 'pronunciation']);
    assert.deepEqual(exercises.sort(), ['grammar-basics', 'pronunciation-practice']);
  });

  it('ignores unknown error tags gracefully', () => {
    const exercises = mapToRemedialExercises(['unknown']);
    assert.deepEqual(exercises, []);
  });

  it('deduplicates remedial exercises for repeated tags', () => {
    const exercises = mapToRemedialExercises(['grammar', 'grammar']);
    assert.deepEqual(exercises, ['grammar-basics']);
  });

  it('allows extension of remediation map at runtime', () => {
    remediationMap.speaking = ['conversation'];
    const exercises = mapToRemedialExercises(['speaking']);
    assert.deepEqual(exercises, ['conversation']);
    delete remediationMap.speaking;
  });
});
