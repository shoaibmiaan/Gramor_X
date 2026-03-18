import { describe, expect, it } from 'vitest';

import { sanitizeInternalNextPath } from '@/lib/authNextPath';

describe('sanitizeInternalNextPath', () => {
  it('accepts normal internal paths', () => {
    expect(sanitizeInternalNextPath('/dashboard?tab=overview')).toBe('/dashboard?tab=overview');
  });

  it('rejects external and protocol-relative paths', () => {
    expect(sanitizeInternalNextPath('https://evil.com')).toBeNull();
    expect(sanitizeInternalNextPath('//evil.com')).toBeNull();
  });

  it('decodes encoded next values and normalizes known route casing', () => {
    expect(sanitizeInternalNextPath('/Welcome%3Frole=Student')).toBe('/welcome?role=Student');
    expect(sanitizeInternalNextPath('%2FWelcome%3Frole%3DStudent')).toBe('/welcome?role=Student');
  });
});
