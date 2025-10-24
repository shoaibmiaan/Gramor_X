import test from 'node:test';
import assert from 'node:assert/strict';

import budgets from '../../tools/perf/budgets.json';

test('mobile writing flows enforce LCP/INP guardrails', () => {
  assert.ok(Array.isArray(budgets.routes), 'Route budgets missing');

  const guardrails = [
    { pattern: '/mock/writing/*', maxLcp: 2500, maxInp: 200 },
    { pattern: '/writing/results/*', maxLcp: 2600, maxInp: 220 },
  ];

  for (const guardrail of guardrails) {
    const entry = budgets.routes.find((route: any) => route.pattern === guardrail.pattern);
    assert.ok(entry, `Missing performance budget for ${guardrail.pattern}`);

    const { lcp, inp } = entry.budgets ?? {};
    assert.equal(
      typeof lcp,
      'number',
      `LCP budget for ${guardrail.pattern} must be a number`,
    );
    assert.equal(
      typeof inp,
      'number',
      `INP budget for ${guardrail.pattern} must be a number`,
    );
    assert.ok(
      lcp <= guardrail.maxLcp,
      `LCP budget for ${guardrail.pattern} exceeds ${guardrail.maxLcp}ms`,
    );
    assert.ok(
      inp <= guardrail.maxInp,
      `INP budget for ${guardrail.pattern} exceeds ${guardrail.maxInp}ms`,
    );
  }
});
