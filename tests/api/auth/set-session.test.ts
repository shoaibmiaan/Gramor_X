import { strict as assert } from 'node:assert';

const calls = {
  setSession: [] as any[],
  signOut: 0,
};

require.cache[require.resolve('@supabase/auth-helpers-nextjs')] = {
  exports: {
    createPagesServerClient: () => ({
      auth: {
        setSession: async (session: any) => {
          calls.setSession.push(session);
        },
        signOut: async () => {
          calls.signOut += 1;
        },
      },
    }),
  },
};

const handler = require('../../../pages/api/auth/set-session').default;

function createRes() {
  return {
    statusCode: 0,
    body: undefined as any,
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
  const session = { access_token: 'tok', refresh_token: 'ref' };
  const resInitial = createRes();
  await handler(
    { method: 'POST', body: { event: 'INITIAL_SESSION', session } } as any,
    resInitial as any,
  );
  assert.equal(resInitial.statusCode, 200);
  assert.equal(resInitial.body.ok, true);
  assert.equal(calls.setSession.length, 1);
  assert.equal(calls.setSession[0], session);

  const resSignedOut = createRes();
  await handler(
    { method: 'POST', body: { event: 'SIGNED_OUT', session: null } } as any,
    resSignedOut as any,
  );
  assert.equal(resSignedOut.statusCode, 200);
  assert.equal(resSignedOut.body.ok, true);
  assert.equal(calls.signOut, 1);

  console.log('set-session events tested');
})();
