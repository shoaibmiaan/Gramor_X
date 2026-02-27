import test from 'node:test';
import assert from 'node:assert/strict';

import budgets from '../../tools/perf/budgets.json';

test('writing route budgets defined', () => {
  assert.equal(Array.isArray(budgets.routes), true);
  const patterns = budgets.routes.map((entry: any) => entry.pattern);
  assert.ok(patterns.includes('/writing/mock/*'));
  assert.ok(patterns.includes('/writing/results/*'));
});
