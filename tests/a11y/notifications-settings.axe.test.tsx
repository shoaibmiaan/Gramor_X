/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import React from 'react';

vi.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    asPath: '/settings/notifications',
    push: () => undefined,
    replace: () => undefined,
  }),
}));

vi.mock('@/lib/analytics/track', () => ({
  track: () => undefined,
}));

describe('A11y: Notifications settings page', () => {
  it('renders without major Axe violations on initial markup', async () => {
    const { default: NotificationsSettingsPage } = await import('@/pages/settings/notifications');
    const markup = renderToStaticMarkup(<NotificationsSettingsPage />);
    const dom = new JSDOM(
      `<!DOCTYPE html><html lang="en"><head><title>Notifications</title></head><body>${markup}</body></html>`,
      { pretendToBeVisual: true },
    );
    const { window } = dom;

    const teardown = primeAxeGlobals(window as unknown as Window & typeof globalThis);

    try {
      injectAxe(window, axe.source);

      const results = await (window as typeof window & { axe: typeof axe }).axe.run(window.document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });

      if (results.violations.length > 0) {
        console.error('Axe violations', JSON.stringify(results.violations, null, 2));
      }

      expect(results.violations).toHaveLength(0);
    } finally {
      teardown();
    }
  });
});

function injectAxe(win: Window, source: string): void {
  if ((win as typeof win & { axe?: unknown }).axe) {
    return;
  }
  win.eval(source);
}

function primeAxeGlobals(win: Window & typeof globalThis): () => void {
  const keys: (keyof typeof globalThis)[] = [
    'window',
    'document',
    'Node',
    'Element',
    'HTMLElement',
    'HTMLInputElement',
  ];

  const previous = new Map<keyof typeof globalThis, unknown>();
  for (const key of keys) {
    previous.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] = (win as Record<string, unknown>)[key];
  }

  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const fallbackNavigator = { userAgent: win.navigator?.userAgent ?? 'node.js' } as Navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    enumerable: true,
    value: fallbackNavigator,
    writable: true,
  });

  return () => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete (globalThis as Record<string, unknown>)[key];
      } else {
        (globalThis as Record<string, unknown>)[key] = value;
      }
    }

    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    } else {
      delete (globalThis as Record<string, unknown>).navigator;
    }
  };
}
