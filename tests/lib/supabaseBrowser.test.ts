import assert from 'node:assert/strict';
import test from 'node:test';

import { authHeaders, supabaseBrowser } from '@/lib/supabaseBrowser';

test('authHeaders omits Authorization when no session access token', async () => {
  const originalGetSession = supabaseBrowser.auth.getSession;

  (supabaseBrowser.auth.getSession as typeof originalGetSession) = async () =>
    ({
      data: { session: null },
      error: null,
    } as any);

  try {
    const headers = await authHeaders({ 'X-Test': '1' });
    assert.deepStrictEqual(headers, { 'X-Test': '1' });
  } finally {
    (supabaseBrowser.auth.getSession as typeof originalGetSession) = originalGetSession;
  }
});

test('authHeaders includes Authorization when access token is present', async () => {
  const originalGetSession = supabaseBrowser.auth.getSession;

  (supabaseBrowser.auth.getSession as typeof originalGetSession) = async () =>
    ({
      data: { session: { access_token: 'token-123' } },
      error: null,
    } as any);

  try {
    const headers = await authHeaders({ Accept: 'application/json' });
    assert.deepStrictEqual(headers, {
      Accept: 'application/json',
      Authorization: 'Bearer token-123',
    });
  } finally {
    (supabaseBrowser.auth.getSession as typeof originalGetSession) = originalGetSession;
  }
});
