import { vi } from 'vitest';

import { FakeSupabase } from './fakeSupabase';

export const fakeSupabase = new FakeSupabase();

export const emailMock = vi.fn(async () => ({ ok: true }));
export const whatsappMock = vi.fn(async () => ({ ok: true }));
export const trackLogMock = vi.fn(async () => undefined);
export const captureExceptionMock = vi.fn();

vi.mock('@/lib/supabaseServer', () => ({
  getServerClient: () => fakeSupabase.createServerClient(),
  supabaseService: () => fakeSupabase.createServiceClient(),
}));

vi.mock('@/lib/analytics/trackor.server', () => ({
  trackor: { log: trackLogMock },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureException: captureExceptionMock,
}));

vi.mock('@/lib/notify/email', () => ({
  sendEmail: emailMock,
}));

vi.mock('@/lib/notify/sms', () => ({
  sendWhatsApp: whatsappMock,
}));

vi.mock('@/lib/url', () => ({
  getBaseUrl: () => 'https://example.test',
}));

vi.mock('@/lib/flags', () => ({
  flags: {
    snapshot: () => ({ notifications: true }),
  },
  resolveFlags: async () => ({ notifications: true }),
  serverEnabled: async () => false,
}));
