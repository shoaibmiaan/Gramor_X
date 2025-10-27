import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import assetlinksHandler from '../../pages/.well-known/assetlinks.json';
import resolveHandler, {
  __resetDeeplinkResolveTestOverrides,
  __setDeeplinkResolveTestOverrides,
} from '../../pages/api/deeplink/resolve';
import {
  ANDROID_ASSET_LINKS,
  APPLE_APP_SITE_ASSOCIATION,
  DEEPLINK_LOOKUP,
} from '../../data/mobile/deeplinks';

type SupabaseStubOptions = {
  user?: any | null;
  plan?: string | null;
  role?: string | null;
  authError?: boolean;
  profileError?: boolean;
};

function createSupabaseStub(options: SupabaseStubOptions) {
  const { user = null, plan = null, role = null, authError = false, profileError = false } = options;

  return {
    auth: {
      async getUser() {
        if (authError) {
          return { data: { user: null }, error: new Error('auth failed') };
        }
        return { data: { user }, error: null };
      },
    },
    from(table: string) {
      assert.equal(table, 'profiles');
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          if (profileError) {
            return { data: null, error: new Error('profile failed') };
          }
          if (!user) {
            return { data: null, error: null };
          }
          return {
            data: { plan, plan_id: plan, role },
            error: null,
          };
        },
      };
    },
  };
}

function stubFactory(options: SupabaseStubOptions) {
  return () => createSupabaseStub(options) as any;
}

function createResponse() {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    payload: undefined as any,
    headers,
    setHeader(name: string, value: string | string[]) {
      headers[name] = Array.isArray(value) ? value.join(', ') : String(value);
    },
    getHeader(name: string) {
      return headers[name];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.payload = data;
      return data;
    },
    end(data?: any) {
      this.payload = data ?? this.payload;
      return this;
    },
  };
}

const ROOT = path.resolve(__dirname, '..', '..');

test('assetlinks handler returns configured statements', async () => {
  const res = createResponse();
  await assetlinksHandler({ method: 'GET', headers: {} } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, ANDROID_ASSET_LINKS);
});

test('assetlinks handler rejects unsupported methods', async () => {
  const res = createResponse();
  await assetlinksHandler({ method: 'POST', headers: {} } as any, res as any);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.payload, { ok: false, error: 'method_not_allowed' });
  assert.equal(res.headers.Allow, 'GET, HEAD');
});

test('apple-app-site-association matches bundle configuration', () => {
  const file = readFileSync(path.join(ROOT, 'public', 'apple-app-site-association'), 'utf8');
  const parsed = JSON.parse(file);
  assert.deepEqual(parsed, APPLE_APP_SITE_ASSOCIATION);
});

test('deeplink resolve succeeds when plan requirements are met', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  const user = { id: 'user-1', app_metadata: {}, user_metadata: {} };
  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user, plan: 'booster', role: 'student' }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'mistakes-book' } } as any, res as any);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload?.ok, true);
  assert.equal(res.payload?.href, DEEPLINK_LOOKUP['mistakes-book'].href);
  assert.equal(res.payload?.currentPlan, 'booster');
  assert.equal(res.payload?.role, 'student');
});

test('deeplink resolve requires authentication when needed', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user: null }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'study-plan' } } as any, res as any);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload?.error, 'unauthorized');
});

test('deeplink resolve enforces plan upgrades', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  const user = { id: 'user-2', app_metadata: {}, user_metadata: {} };
  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user, plan: 'starter', role: 'student' }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'mistakes-book' } } as any, res as any);

  assert.equal(res.statusCode, 402);
  assert.equal(res.payload?.error, 'upgrade_required');
  assert.equal(res.payload?.requiredPlan, 'booster');
});

test('deeplink resolve restricts staff-only slugs', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  const user = { id: 'user-3', app_metadata: {}, user_metadata: {} };
  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user, plan: 'master', role: 'teacher' }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'admin-flags' } } as any, res as any);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload?.error, 'forbidden');
});

test('deeplink resolve allows teacher bypass for mistakes book', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  const user = { id: 'user-4', app_metadata: {}, user_metadata: {} };
  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user, plan: 'free', role: 'teacher' }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'mistakes-book' } } as any, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.ok, true);
  assert.equal(res.payload?.role, 'teacher');
});

test('deeplink resolve permits anonymous access for public slugs', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user: null }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'home' } } as any, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.ok, true);
  assert.equal(res.payload?.requiresAuth, false);
});

test('deeplink resolve returns 404 for unknown slugs', async (t) => {
  t.after(() => __resetDeeplinkResolveTestOverrides());

  __setDeeplinkResolveTestOverrides({ getClient: stubFactory({ user: null }) });

  const res = createResponse();
  await resolveHandler({ method: 'GET', query: { slug: 'unknown' } } as any, res as any);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload?.error, 'invalid_slug');
});

