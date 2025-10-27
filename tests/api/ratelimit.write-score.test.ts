import test from 'node:test';
import assert from 'node:assert/strict';

import { applyRateLimit } from '@/lib/limits/rate';
import { redis } from '@/lib/redis';

test('allows requests under the limit', async () => {
  await redis.del('rl:test:user:0');
  await redis.del('rl:test:user:-1');
  const scope = { route: 'test', identifier: 'user', userId: 'user-1' };
  const result = await applyRateLimit(scope, { windowMs: 1000, max: 2 });
  assert.equal(result.blocked, false);
  assert.ok(result.remaining >= 0);
});

test('blocks when exceeding sliding window limit', async () => {
  await redis.del('rl:test:user:0');
  await redis.del('rl:test:user:-1');
  const scope = { route: 'test', identifier: 'user', userId: 'user-1' };
  await applyRateLimit(scope, { windowMs: 1000, max: 1 });
  const second = await applyRateLimit(scope, { windowMs: 1000, max: 1 });
  assert.equal(second.blocked, true);
  assert.ok((second.retryAfter ?? 0) > 0);
});
