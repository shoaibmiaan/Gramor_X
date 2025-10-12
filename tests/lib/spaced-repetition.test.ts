import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleDrill, isDue, scheduleReview, Drill } from '../../lib/spaced-repetition';

describe('spaced-repetition', () => {
  const baseDrill: Drill = {
    id: 'd1',
    interval: 1,
    repetition: 1,
    ease: 2.5,
    due: new Date('2024-01-01T00:00:00Z'),
  };

  it('resets repetition and short interval on low grades', () => {
    const updated = scheduleDrill({ ...baseDrill }, 2);
    assert.equal(updated.repetition, 0);
    assert.equal(updated.interval, 1);
  });

  it('keeps increasing ease with good performance', () => {
    const updated = scheduleDrill({ ...baseDrill }, 5);
    assert.ok(updated.ease > baseDrill.ease);
  });

  it('schedules further intervals for repeated success', () => {
    const drill = { ...baseDrill, repetition: 3, interval: 6 };
    const updated = scheduleDrill(drill, 5);
    assert.ok(updated.interval >= drill.interval);
  });

  it('determines whether a drill is due on the provided date', () => {
    const future = new Date('2024-01-02T00:00:00Z');
    const dueDrill = { ...baseDrill, due: new Date('2023-12-31T00:00:00Z') };
    assert.equal(isDue(dueDrill, future), true);
    assert.equal(isDue({ ...dueDrill, due: new Date('2024-01-03T00:00:00Z') }, future), false);
  });

  it('produces review dates that never move backwards', () => {
    const first = scheduleReview(0).getTime();
    const second = scheduleReview(1).getTime();
    const later = scheduleReview(10).getTime();
    assert.ok(first >= Date.now());
    assert.ok(second >= first);
    assert.ok(later >= second);
  });
});
