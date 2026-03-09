import { describe, expect, it } from 'vitest';

import { normalizeCycleInput } from '@/types/payments';

describe('normalizeCycleInput', () => {
  it('keeps canonical values', () => {
    expect(normalizeCycleInput('monthly')).toBe('monthly');
    expect(normalizeCycleInput('annual')).toBe('annual');
  });

  it('maps yearly alias to annual', () => {
    expect(normalizeCycleInput('yearly')).toBe('annual');
  });

  it('defaults unknown/null to monthly', () => {
    expect(normalizeCycleInput('whatever')).toBe('monthly');
    expect(normalizeCycleInput(null)).toBe('monthly');
    expect(normalizeCycleInput(undefined)).toBe('monthly');
  });
});
