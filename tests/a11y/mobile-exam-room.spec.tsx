import React from 'react';
import { render, screen } from '@testing-library/react';
import * as axe from 'axe-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { KeyboardAwareSheet } from '@/components/mobile/KeyboardAwareSheet';
import { InstallBanner } from '@/components/mobile/InstallBanner';
import { PushOptInCard } from '@/components/mobile/PushOptInCard';

async function runAxe(container: HTMLElement) {
  return axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
}

describe('A11y: mobile exam engagement sheet', () => {
  beforeAll(() => {
    const notificationStub = {
      permission: 'default' as NotificationPermission,
      requestPermission: vi.fn(async () => {
        notificationStub.permission = 'granted';
        return 'granted' as NotificationPermission;
      }),
    };
    Object.defineProperty(globalThis, 'Notification', {
      value: notificationStub,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'Notification', {
      value: notificationStub,
      configurable: true,
      writable: true,
    });
  });

  it('renders an accessible bottom sheet with install and push actions', async () => {
    const promptEvent = {
      prompt: vi.fn(async () => undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'test' }),
    };

    const { container } = render(
      <KeyboardAwareSheet open title="Stay connected" description="Install or enable alerts" onClose={() => {}}>
        <InstallBanner promptEvent={promptEvent as any} />
        <PushOptInCard />
      </KeyboardAwareSheet>,
    );

    const dialog = screen.getByRole('dialog', { name: /stay connected/i });
    expect(dialog).toBeTruthy();

    const results = await runAxe(container);
    expect(results.violations.length).toBe(0);
  });
});
