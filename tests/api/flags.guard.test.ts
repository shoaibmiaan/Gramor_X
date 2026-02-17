import test from 'node:test';
import assert from 'node:assert/strict';

import { flags, primeClientSnapshot } from '@/lib/flags';

test('merges client snapshot overrides', () => {
  assert.equal(typeof flags.snapshot().trial, 'boolean');

  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {};

  primeClientSnapshot({ writingExports: true });
  assert.equal(flags.enabled('writingExports'), true);

  if (originalWindow === undefined) {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = originalWindow;
  }
});
