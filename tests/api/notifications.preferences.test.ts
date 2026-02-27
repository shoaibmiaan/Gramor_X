/**
 * @vitest-environment node
 */
import httpMocks from 'node-mocks-http';
import { beforeEach, describe, expect, it } from 'vitest';

import '../notifications/setup';
import { fakeSupabase } from '../notifications/setup';

import handler from '@/pages/api/notifications/preferences';

describe('API: /api/notifications/preferences', () => {
  beforeEach(() => {
    fakeSupabase.reset();
  });

  it('returns 401 when the request is unauthenticated', async () => {
    fakeSupabase.setAuthUser(null);
    const req = httpMocks.createRequest({ method: 'GET' });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(401);
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' });
  });

  it('returns merged preferences with contact information', async () => {
    fakeSupabase.setAuthUser({ id: '00000000-0000-4000-8000-000000000300' });
    fakeSupabase.setTable('notifications_opt_in', [
      {
        user_id: '00000000-0000-4000-8000-000000000300',
        channels: ['whatsapp'],
        email_opt_in: false,
        wa_opt_in: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        timezone: 'Asia/Kolkata',
      },
    ]);
    fakeSupabase.setTable('profiles', [
      {
        user_id: '00000000-0000-4000-8000-000000000300',
        email: 'learner@example.com ',
        phone: ' +15550001111 ',
        phone_verified: true,
        timezone: 'Asia/Kolkata',
      },
    ]);

    const req = httpMocks.createRequest({ method: 'GET' });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    const json = res._getJSONData();
    expect(json.preferences.channels).toEqual({ email: false, whatsapp: true });
    expect(json.preferences.email).toBe('learner@example.com');
    expect(json.preferences.phone).toBe('+15550001111');
    expect(json.preferences.timezone).toBe('Asia/Kolkata');
    expect(json.preferences.quietHoursStart).toBe('22:00');
    expect(json.preferences.quietHoursEnd).toBe('07:00');
  });

  it('upserts preferences and normalises quiet hours', async () => {
    fakeSupabase.setAuthUser({ id: '00000000-0000-4000-8000-000000000301' });
    fakeSupabase.setTable('profiles', [
      {
        user_id: '00000000-0000-4000-8000-000000000301',
        email: 'pref@example.com',
        phone: null,
        phone_verified: false,
        timezone: 'UTC',
      },
    ]);

    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        channels: { email: true, whatsapp: true },
        quietHoursStart: null,
        quietHoursEnd: '05:30',
        timezone: 'America/New_York',
      },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    const json = res._getJSONData();
    expect(json.preferences.channels).toEqual({ email: true, whatsapp: true });
    expect(json.preferences.quietHoursStart).toBeNull();
    expect(json.preferences.quietHoursEnd).toBe('05:30');
    expect(json.preferences.timezone).toBe('America/New_York');

    const stored = fakeSupabase.getTable('notifications_opt_in');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      user_id: '00000000-0000-4000-8000-000000000301',
      timezone: 'America/New_York',
      quiet_hours_start: null,
      quiet_hours_end: '05:30',
    });
    expect(stored[0].channels).toContain('whatsapp');
  });
});
