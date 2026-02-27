import React from 'react';
import { render } from '@testing-library/react';
import * as axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

import AccessibilityHints from '@/components/writing/AccessibilityHints';
import { LocaleProvider } from '@/lib/locale';
import { loadTranslations } from '@/lib/i18n';

async function runAxe(container: HTMLElement) {
  const results = await (axe as any).run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results;
}

describe('A11y: AccessibilityHints', () => {
  beforeAll(async () => {
    await loadTranslations('en');
  });

  it('has no major axe violations', async () => {
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <AccessibilityHints />
      </LocaleProvider>
    );

    const results = await runAxe(container);
    expect(results.violations.length).toBe(0);
  });
});
