/**
 * @vitest-environment node
 */
import httpMocks from 'node-mocks-http';
import { beforeEach, describe, expect, it } from 'vitest';

import '../notifications/setup';
import { fakeSupabase } from '../notifications/setup';

import handler from '@/pages/api/notifications/nudge';

describe('API: /api/notifications/nudge', () => {
  beforeEach(() => {
    fakeSupabase.reset();
  });

  it('denies access to non admin/teacher roles', async () => {
    fakeSupabase.setAuthUser({ id: '00000000-0000-4000-8000-000000000111' });
    fakeSupabase.setTable('profiles', [
      {
        id: '00000000-0000-4000-8000-000000000111',
        user_id: '00000000-0000-4000-8000-000000000111',
        plan: 'starter',
        role: 'student',
      },
    ]);

    const req = httpMocks.createRequest({
      method: 'POST',
      body: { user_id: '00000000-0000-4000-8000-000000000200', event_key: 'nudge_manual' },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(403);
    expect(res._getJSONData()).toEqual({ error: 'Forbidden' });
    expect(fakeSupabase.getTable('notification_events')).toHaveLength(0);
  });

  it('enqueues a nudge for admin users with derived idempotency key', async () => {
    fakeSupabase.setAuthUser({ id: '00000000-0000-4000-8000-000000000112' });
    fakeSupabase.setTable('profiles', [
      {
        id: '00000000-0000-4000-8000-000000000112',
        user_id: '00000000-0000-4000-8000-000000000112',
        plan: 'starter',
        role: 'admin',
      },
    ]);

    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        user_id: '00000000-0000-4000-8000-000000000200',
        event_key: 'nudge_manual',
        payload: { message: 'Study!' },
      },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    const json = res._getJSONData();
    expect(json.id).toMatch(/^notification_events-/);

    const [event] = fakeSupabase.getTable('notification_events');
    expect(event).toMatchObject({
      user_id: '00000000-0000-4000-8000-000000000200',
      event_key: 'nudge_manual',
      idempotency_key: expect.stringContaining(
        'nudge_manual:00000000-0000-4000-8000-000000000200',
      ),
    });
  });
});
