import assert from 'node:assert/strict';
import test from 'node:test';

import { loadWordPacks } from '@/lib/content/word-packs';
import { validateWordPacks } from '@/lib/content/validate';

test('word pack metadata passes lint checks', () => {
  const packs = loadWordPacks();
  const issues = validateWordPacks(packs);
  assert.strictEqual(issues.length, 0, issues.join('\n'));
});
