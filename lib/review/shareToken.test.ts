import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createProgressShareToken,
  createReviewShareToken,
  verifyProgressShareToken,
  verifyReviewShareToken,
} from './shareToken';

test('review share tokens round-trip with expected payload', () => {
  const { token } = createReviewShareToken('attempt_123', 2);
  const verified = verifyReviewShareToken(token);

  assert.equal(verified.attemptId, 'attempt_123');
  assert.ok(verified.expiresAt.getTime() > Date.now());
});

test('progress share tokens round-trip with expected payload', () => {
  const { token } = createProgressShareToken('user_123', 2);
  const verified = verifyProgressShareToken(token);

  assert.equal(verified.userId, 'user_123');
  assert.ok(verified.expiresAt.getTime() > Date.now());
});

test('scope mismatch is rejected for progress share verification', () => {
  const { token } = createReviewShareToken('attempt_123', 2);
  assert.throws(() => verifyProgressShareToken(token));
});
