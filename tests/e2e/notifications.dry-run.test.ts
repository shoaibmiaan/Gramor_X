/**
 * @vitest-environment node
 */
import httpMocks from 'node-mocks-http';
import { beforeEach, describe, expect, it } from 'vitest';

import '../notifications/setup';
import {
  emailMock,
  fakeSupabase,
  trackLogMock,
  whatsappMock,
} from '../notifications/setup';

import { dispatchPending, queueNotificationEvent } from '@/lib/notify';
import preferencesHandler from '@/pages/api/notifications/preferences';

describe('Notifications E2E dry run', () => {
  beforeEach(() => {
    fakeSupabase.reset();
    emailMock.mockClear();
    whatsappMock.mockClear();
    trackLogMock.mockClear();
  });

  it('processes queued events from enqueue through dispatch', async () => {
    const userId = 'c1d7b5e1-a2aa-4d6f-b483-99099c9a3aa0';
    fakeSupabase.setAuthUser({ id: userId });

    fakeSupabase.setTable('profiles', [
      {
        id: userId,
        user_id: userId,
        email: 'casey@example.com',
        phone: '+15551234567',
        full_name: 'Casey Learner',
        timezone: 'UTC',
      },
    ]);

    const prefReq = httpMocks.createRequest({
      method: 'POST',
      body: {
        channels: { email: true, whatsapp: true },
        timezone: 'UTC',
      },
    });
    const prefRes = httpMocks.createResponse();
    await preferencesHandler(prefReq as any, prefRes as any);
    expect(prefRes.statusCode).toBe(200);

    fakeSupabase.setTable('notification_templates', [
      {
        id: 'tmpl-email',
        template_key: 'study_reminder',
        channel: 'email',
        locale: 'en',
        subject: 'Study reminder',
        body: 'Hi {{first_name}}, study now!',
        metadata: {},
      },
      {
        id: 'tmpl-wa',
        template_key: 'study_reminder',
        channel: 'whatsapp',
        locale: 'en',
        subject: null,
        body: 'WA ping {{first_name}}',
        metadata: {},
      },
    ]);

    emailMock.mockResolvedValueOnce({ ok: true, noop: false });
    whatsappMock.mockResolvedValueOnce({ ok: true, noop: true });

    const enqueueResult = await queueNotificationEvent({
      event_key: 'study_reminder',
      user_id: userId,
      channels: ['email', 'whatsapp'],
      payload: { first_name: 'Casey' },
    });

    expect(enqueueResult.ok).toBe(true);
    expect(trackLogMock).toHaveBeenCalledWith('notification_enqueued', expect.any(Object));

    const dispatchReq = httpMocks.createRequest({ method: 'POST' });
    const dispatchRes = httpMocks.createResponse();
    await dispatchPending(dispatchReq as any, dispatchRes as any);

    expect(dispatchRes.statusCode).toBe(200);
    const summary = dispatchRes._getJSONData().summary;
    expect(summary.eventsProcessed).toBe(1);
    expect(summary.deliveriesSent).toBe(2);
    expect(summary.deliveriesNoop).toBe(1);

    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(emailMock.mock.calls[0][0]).toMatchObject({ to: 'casey@example.com' });
    expect(whatsappMock).toHaveBeenCalledTimes(1);

    const deliveries = fakeSupabase.getTable('notification_deliveries');
    expect(deliveries).toHaveLength(2);
    expect(deliveries.filter((d) => d.status === 'sent')).toHaveLength(2);

    const sentLogs = trackLogMock.mock.calls
      .filter(([event]) => event === 'delivery_sent')
      .map(([, payload]) => payload);
    expect(sentLogs).toHaveLength(2);
    expect(sentLogs[0]).toMatchObject({ channel: 'email', userId: userId });
    expect(sentLogs[1]).toMatchObject({ channel: 'whatsapp', userId: userId, noop: true });
  });
});
