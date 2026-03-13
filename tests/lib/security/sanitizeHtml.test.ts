import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeHtml } from '@/lib/security/sanitizeHtml';

test('removes script tags and inline event handlers', () => {
  const dirty = '<p onclick="alert(1)">Hello</p><script>alert(2)</script>';
  const clean = sanitizeHtml(dirty);

  assert.equal(clean.includes('script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.match(clean, /<p>Hello<\/p>/);
});

test('blocks javascript: urls in href', () => {
  const dirty = '<a href="javascript:alert(1)">x</a><a href="https://safe.com">safe</a>';
  const clean = sanitizeHtml(dirty);

  assert.equal(clean.includes('javascript:'), false);
  assert.match(clean, /<a>x<\/a>/);
  assert.match(clean, /href="https:\/\/safe.com"/);
});

test('removes disallowed tags but preserves text', () => {
  const dirty = '<iframe src="https://evil.com"></iframe><div>ok</div>';
  const clean = sanitizeHtml(dirty);

  assert.equal(clean.includes('iframe'), false);
  assert.match(clean, /<div>ok<\/div>/);
});
