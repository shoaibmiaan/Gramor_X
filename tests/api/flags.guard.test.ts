import test from 'node:test';
import assert from 'node:assert/strict';

import { flags, primeClientSnapshot } from '@/lib/flags';

test('merges client snapshot overrides', () => {
  assert.equal(typeof flags.snapshot().trial, 'boolean');
  primeClientSnapshot({ writingExports: true });
  assert.equal(flags.enabled('writingExports'), true);
});
