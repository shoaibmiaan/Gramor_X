// tests/api/auth/set-session.test.ts
import { strict as assert } from 'node:assert';

function withAuthStub(auth: Record<string, any>) {
  const helperPath = require.resolve('../../../../lib/supabaseServer');
  const handlerPath = require.resolve('../../../pages/api/auth/set-session');

  delete require.cache[helperPath];
  delete require.cache[handlerPath];

  require.cache[helperPath] = {
    exports: {
      getServerClient: () => ({ auth }),
    },
  } as any;

  return require(handlerPath).default;
}

function createRes() {
  const headers: Record<string, string | string[]> = {};
  return {
    statusCode: 0,
    body: undefined as any,
    getHeader(name: string) {
      return headers[name];
    },
    setHeader(name: string, value: string | string[]) {
      headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
}

(async () => {
  // Scenario 1: Supabase helpers expose setSession/signOut
  const calls = { setSession: [] as any[], signOut: 0 };
  const handlerWithHelpers = withAuthStub({
    setSession: async (session: any) => {
      calls.setSession.push(session);
    },
    signOut: async () => {
      calls.signOut += 1;
    },
  });

  const session = { access_token: 'tok', refresh_token: 'ref' };

  const resInitial = createRes();
  await handlerWithHelpers(
    { method: 'POST', body: { event: 'INITIAL_SESSION', session } } as any,
    resInitial as any,
  );
  assert.equal(resInitial.statusCode, 200);
  assert.equal(resInitial.body.ok, true);
  assert.equal(calls.setSession.length, 1);
  assert.equal(calls.setSession[0], session);
  assert.equal(resInitial.getHeader('Set-Cookie'), undefined);

  const resSignedOut = createRes();
  await handlerWithHelpers(
    { method: 'POST', body: { event: 'SIGNED_OUT', session: null } } as any,
    resSignedOut as any,
  );
  assert.equal(resSignedOut.statusCode, 200);
  assert.equal(resSignedOut.body.ok, true);
  assert.equal(calls.signOut, 1);

  // Scenario 1b: Helpers are present but throw -> fallback should recover
  const failingHandler = withAuthStub({
    setSession: async () => {
      throw new TypeError('setSession not supported');
    },
    signOut: async () => {
      throw new Error('signOut not supported');
    },
  });

  const failingRes = createRes();
  await failingHandler(
    { method: 'POST', body: { event: 'SIGNED_IN', session } } as any,
    failingRes as any,
  );
  assert.equal(failingRes.statusCode, 200);
  assert.equal(failingRes.body.ok, true);
  const failingCookies = failingRes.getHeader('Set-Cookie');
  assert.ok(Array.isArray(failingCookies));
  assert.ok(String(failingCookies?.[0]).includes('sb-access-token=tok'));

  const failingSignOutRes = createRes();
  await failingHandler(
    { method: 'POST', body: { event: 'SIGNED_OUT', session: null } } as any,
    failingSignOutRes as any,
  );
  assert.equal(failingSignOutRes.statusCode, 200);
  assert.equal(failingSignOutRes.body.ok, true);
  const failingCleared = failingSignOutRes.getHeader('Set-Cookie');
  assert.ok(Array.isArray(failingCleared));
  ['sb-access-token', 'sb-refresh-token', 'sb:token', 'supabase-auth-token'].forEach((name) => {
    assert.ok(
      failingCleared?.some((cookieValue) =>
        String(cookieValue).includes(`${name}=`) && String(cookieValue).includes('Max-Age=0'),
      ),
    );
  });

  // Scenario 2: Fallback without helper methods
  const handlerWithFallback = withAuthStub({});
  const fallbackRes = createRes();
  await handlerWithFallback(
    { method: 'POST', body: { event: 'INITIAL_SESSION', session } } as any,
    fallbackRes as any,
  );
  assert.equal(fallbackRes.statusCode, 200);
  assert.equal(fallbackRes.body.ok, true);
  const cookies = fallbackRes.getHeader('Set-Cookie');
  assert.ok(Array.isArray(cookies));
  assert.equal(cookies?.length, 2);
  assert.ok(String(cookies?.[0]).includes('sb-access-token=tok'));
  assert.ok(String(cookies?.[1]).includes('sb-refresh-token=ref'));

  const fallbackInitialNullRes = createRes();
  await handlerWithFallback(
    { method: 'POST', body: { event: 'INITIAL_SESSION', session: null } } as any,
    fallbackInitialNullRes as any,
  );
  assert.equal(fallbackInitialNullRes.statusCode, 200);
  assert.equal(fallbackInitialNullRes.body.ok, true);
  const initialNullCookies = fallbackInitialNullRes.getHeader('Set-Cookie');
  assert.ok(Array.isArray(initialNullCookies));
  assert.equal(initialNullCookies?.length, 4);
  ['sb-access-token', 'sb-refresh-token', 'sb:token', 'supabase-auth-token'].forEach((name) => {
    assert.ok(
      initialNullCookies?.some((cookieValue) =>
        String(cookieValue).includes(`${name}=`) && String(cookieValue).includes('Max-Age=0'),
      ),
    );
  });

  const fallbackSignOutRes = createRes();
  await handlerWithFallback(
    { method: 'POST', body: { event: 'SIGNED_OUT', session: null } } as any,
    fallbackSignOutRes as any,
  );
  assert.equal(fallbackSignOutRes.statusCode, 200);
  assert.equal(fallbackSignOutRes.body.ok, true);
  const clearedCookies = fallbackSignOutRes.getHeader('Set-Cookie');
  assert.ok(Array.isArray(clearedCookies));
  ['sb-access-token', 'sb-refresh-token', 'sb:token', 'supabase-auth-token'].forEach((name) => {
    assert.ok(
      clearedCookies?.some((cookieValue) =>
        String(cookieValue).includes(`${name}=`) && String(cookieValue).includes('Max-Age=0'),
      ),
    );
  });

  console.log('set-session events tested');
})();
