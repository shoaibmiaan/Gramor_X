import assert from 'node:assert/strict';
import test from 'node:test';

import {
  recordLoginEvent,
  signOutAndRedirect,
  syncServerSession,
  verifyEmailOtp,
  exchangeCodeWithVerifier,
  resetPasswordForEmail,
} from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

test('verifyEmailOtp falls back from signup to email type', async () => {
  const originalVerifyOtp = supabaseBrowser.auth.verifyOtp;
  const calls: string[] = [];

  (supabaseBrowser.auth.verifyOtp as typeof originalVerifyOtp) = async (payload: any) => {
    calls.push(payload.type);
    if (payload.type === 'signup') return { data: { session: null, user: null }, error: new Error('first failed') } as any;
    return { data: { session: null, user: { id: 'u1' } }, error: null } as any;
  };

  try {
    const result = await verifyEmailOtp({ email: 'user@example.com', token: '123456' });
    assert.equal(result.error, null);
    assert.deepEqual(calls, ['signup', 'email']);
  } finally {
    (supabaseBrowser.auth.verifyOtp as typeof originalVerifyOtp) = originalVerifyOtp;
  }
});

test('syncServerSession posts to /api/auth/set-session', async () => {
  const oldFetch = global.fetch;
  let postedBody = '';

  global.fetch = (async (_input: any, init?: any) => {
    postedBody = String(init?.body ?? '');
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as any;
  }) as any;

  try {
    const ok = await syncServerSession({ access_token: 'a', refresh_token: 'b' } as any, 'SIGNED_IN');
    assert.equal(ok, true);
    assert.match(postedBody, /SIGNED_IN/);
    assert.match(postedBody, /access_token/);
  } finally {
    global.fetch = oldFetch;
  }
});

test('recordLoginEvent retries once after 401 by syncing session', async () => {
  const oldFetch = global.fetch;
  let calls = 0;

  global.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('/api/auth/login-event')) {
      calls += 1;
      if (calls === 1) return { status: 401, ok: false, json: async () => ({}) } as any;
      return { status: 200, ok: true, json: async () => ({}) } as any;
    }

    return { status: 200, ok: true, json: async () => ({ ok: true }) } as any;
  }) as any;

  try {
    await recordLoginEvent({ access_token: 'a', refresh_token: 'b' } as any);
    assert.equal(calls, 2);
  } finally {
    global.fetch = oldFetch;
  }
});

test('signOutAndRedirect clears local session and redirects', async () => {
  const oldFetch = global.fetch;
  const oldWindow = (global as any).window;
  const oldLocalStorage = (global as any).localStorage;
  const oldSessionStorage = (global as any).sessionStorage;
  const originalSignOut = supabaseBrowser.auth.signOut;

  let redirected = '';

  (supabaseBrowser.auth.signOut as typeof originalSignOut) = async () => ({ error: null } as any);
  global.fetch = (async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) })) as any;
  (global as any).window = { location: { replace: (href: string) => { redirected = href; } } };
  (global as any).localStorage = { removeItem: () => {} };
  (global as any).sessionStorage = { removeItem: () => {} };

  try {
    await signOutAndRedirect();
    assert.equal(redirected, '/login?signedout=1');
  } finally {
    (supabaseBrowser.auth.signOut as typeof originalSignOut) = originalSignOut;
    global.fetch = oldFetch;
    (global as any).window = oldWindow;
    (global as any).localStorage = oldLocalStorage;
    (global as any).sessionStorage = oldSessionStorage;
  }
});


test('exchangeCodeWithVerifier posts auth_code and verifier', async () => {
  const oldFetch = global.fetch;
  let body = '';

  global.fetch = (async (_input: any, init?: any) => {
    body = String(init?.body ?? '');
    return { ok: true, json: async () => ({ data: { session: { access_token: 'x' } } }) } as any;
  }) as any;

  try {
    const payload = await exchangeCodeWithVerifier('code-1', 'verifier-1');
    assert.match(body, /code-1/);
    assert.match(body, /verifier-1/);
    assert.equal((payload as any).data.session.access_token, 'x');
  } finally {
    global.fetch = oldFetch;
  }
});

test('resetPasswordForEmail delegates to supabase auth', async () => {
  const original = supabaseBrowser.auth.resetPasswordForEmail;
  let called = false;

  (supabaseBrowser.auth.resetPasswordForEmail as typeof original) = async () => {
    called = true;
    return { data: {}, error: null } as any;
  };

  try {
    await resetPasswordForEmail('user@example.com', 'http://localhost/reset');
    assert.equal(called, true);
  } finally {
    (supabaseBrowser.auth.resetPasswordForEmail as typeof original) = original;
  }
});
