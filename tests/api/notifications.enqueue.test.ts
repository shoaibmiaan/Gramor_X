/**
 * @vitest-environment node
 */
import httpMocks from 'node-mocks-http';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import '../notifications/setup';
import { fakeSupabase } from '../notifications/setup';

import handler from '@/pages/api/notifications/enqueue';
import type { NotificationEvent } from '@/types/supabase';

describe('API: /api/notifications/enqueue', () => {
  const originalSecret = process.env.NOTIFICATIONS_ENQUEUE_SECRET;
  const originalLimit = process.env.NOTIFICATIONS_ENQUEUE_LIMIT;

  beforeEach(() => {
    fakeSupabase.reset();
    process.env.NOTIFICATIONS_ENQUEUE_SECRET = 'enqueue-secret';
    delete process.env.NOTIFICATIONS_ENQUEUE_LIMIT;
  });

  afterEach(() => {
    fakeSupabase.reset();
  });

  afterAll(() => {
    process.env.NOTIFICATIONS_ENQUEUE_SECRET = originalSecret;
    if (originalLimit === undefined) {
      delete process.env.NOTIFICATIONS_ENQUEUE_LIMIT;
    } else {
      process.env.NOTIFICATIONS_ENQUEUE_LIMIT = originalLimit;
    }
  });

  it('rejects requests without the required secret header', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { event_key: 'study_reminder', user_id: '26a5d883-0f9c-4cf5-9b03-b3eec380a4b2' },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(401);
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 429 when the per-user rate limit is exceeded', async () => {
    const userId = '0a1f3d23-1f80-4e58-8203-04998b5b3c4c';
    const eventKey = 'study_reminder';

    process.env.NOTIFICATIONS_ENQUEUE_LIMIT = '2';

    const existing: NotificationEvent[] = [
      {
        id: 'event-1',
        user_id: userId,
        event_key: eventKey,
        locale: 'en',
        payload: {},
        requested_channels: ['email'],
        idempotency_key: 'first',
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: null,
      },
      {
        id: 'event-2',
        user_id: userId,
        event_key: eventKey,
        locale: 'en',
        payload: {},
        requested_channels: ['email'],
        idempotency_key: 'second',
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: null,
      },
    ];
    fakeSupabase.setTable('notification_events', existing);

    const req = httpMocks.createRequest({
      method: 'POST',
      headers: { 'x-notifications-secret': 'enqueue-secret' },
      body: { event_key: eventKey, user_id: userId },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(429);
    expect(res._getJSONData()).toEqual({ error: 'Rate limit exceeded' });
  });

  it('returns 409 on duplicate idempotency keys', async () => {
    const userId = '1fd4cf87-2dd9-4e35-8d9c-8fa5c9be1c47';
    const body = {
      event_key: 'score_ready',
      user_id: userId,
      idempotency_key: 'dup-key',
      payload: { module: 'writing', band: 7 },
    };

    const req1 = httpMocks.createRequest({
      method: 'POST',
      headers: { 'x-notifications-secret': 'enqueue-secret' },
      body,
    });
    const res1 = httpMocks.createResponse();
    await handler(req1 as any, res1 as any);
    expect(res1.statusCode).toBe(200);
    const first = res1._getJSONData();
    expect(first.id).toBeTruthy();

    const req2 = httpMocks.createRequest({
      method: 'POST',
      headers: { 'x-notifications-secret': 'enqueue-secret' },
      body,
    });
    const res2 = httpMocks.createResponse();
    await handler(req2 as any, res2 as any);

    expect(res2.statusCode).toBe(409);
    expect(res2._getJSONData()).toEqual({ error: 'Event already enqueued', id: first.id });
  });

  it('enqueues events when authorised and under the rate limit', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      headers: { 'x-notifications-secret': 'enqueue-secret' },
      body: {
        event_key: 'study_reminder',
        user_id: 'c2d4d82f-95e7-44b6-9f49-0d208d6b00b2',
        payload: { first_name: 'Riley' },
        channels: ['email'],
        idempotency_key: 'enqueue-ok',
      },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    const json = res._getJSONData();
    expect(json.id).toMatch(/^notification_events-/);

    const events = fakeSupabase.getTable('notification_events');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      user_id: 'c2d4d82f-95e7-44b6-9f49-0d208d6b00b2',
      event_key: 'study_reminder',
      idempotency_key: 'enqueue-ok',
    });
  });
});
