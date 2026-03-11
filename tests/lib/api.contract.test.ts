import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, request, setApiTokenProvider, addRequestInterceptor, addResponseInterceptor } from '@/lib/api';

describe('lib/api contract tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setApiTokenProvider(() => 'token_123');
  });

  it('auth.login posts credentials and returns parsed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ session: { access_token: 'a', refresh_token: 'r' }, mfaRequired: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.auth.login({ email: 'demo@gramorx.com', password: 'secret' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect(result.data.session?.access_token).toBe('a');
  });

  it('payments.createIntent posts and returns clientSecret', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ clientSecret: 'pi_secret_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.payments.createIntent({ plan: 'starter', cycle: 'monthly' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/payments/create-intent',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.data.clientSecret).toBe('pi_secret_123');
  });

  it('subscription.status injects bearer token and parses response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, active: true, subscription: { plan: 'starter' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.subscription.status();
    const requestHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit)?.headers as Headers;

    expect(requestHeaders.get('Authorization')).toBe('Bearer token_123');
    expect((result.data as any).active).toBe(true);
  });

  it('invokes request/response interceptors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const removeReq = addRequestInterceptor(onRequest);
    const removeRes = addResponseInterceptor(onResponse);

    await request('/api/test-interceptor');

    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onResponse).toHaveBeenCalledTimes(1);

    removeReq();
    removeRes();
  });
});
