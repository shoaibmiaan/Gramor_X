import { strict as assert } from 'node:assert';

const helperPath = require.resolve('@/lib/supabaseServer');
const listHandlerPath = require.resolve('@/pages/api/saved/index');
const deleteHandlerPath = require.resolve('@/pages/api/saved/[id]');

type ListResult = { data: any[]; error: any };
type DeleteResult = { data: any; error: any };

type Behaviour = {
  authUser?: { id: string } | null;
  listResult?: ListResult;
  deleteResult?: DeleteResult;
};

function makeListBuilder(result: ListResult) {
  const builder: any = {
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    lt() {
      return builder;
    },
    eq() {
      return builder;
    },
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeDeleteBuilder(result: DeleteResult) {
  return {
    eq() {
      return this;
    },
    select() {
      return {
        maybeSingle: async () => result,
      };
    },
  };
}

function createHandlers(behaviour: Behaviour) {
  delete require.cache[helperPath];
  delete require.cache[listHandlerPath];
  delete require.cache[deleteHandlerPath];

  const state = {
    authUser: behaviour.authUser ?? { id: 'user-1' },
    listResult:
      behaviour.listResult ?? {
        data: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            resource_id: 'reading-1',
            type: 'reading',
            category: 'bookmark',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      },
    deleteResult: behaviour.deleteResult ?? { data: { id: '111' }, error: null },
  };

  require.cache[helperPath] = {
    exports: {
      createSupabaseServerClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: state.authUser }, error: null }),
        },
        from: (table: string) => {
          if (table !== 'user_bookmarks') {
            throw new Error(`Unexpected table ${table}`);
          }
          return {
            select: () => makeListBuilder(state.listResult),
            delete: () => makeDeleteBuilder(state.deleteResult),
          } as any;
        },
      }),
    },
  } as any;

  const listHandler = require(listHandlerPath).default;
  const deleteHandler = require(deleteHandlerPath).default;
  return { listHandler, deleteHandler, state };
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, string | string[]>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return data;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
    },
  };
}

(async () => {
  // GET /saved success (200)
  const { listHandler } = createHandlers({
    listResult: {
      data: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          resource_id: 'reading-42',
          type: 'reading',
          category: 'bookmark',
          created_at: '2024-02-02T00:00:00.000Z',
        },
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          resource_id: 'listening-9',
          type: 'listening',
          category: 'bookmark',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    },
  });
  const listRes = createRes();
  await listHandler({ method: 'GET', query: {} } as any, listRes as any);
  assert.equal(listRes.statusCode, 200);
  assert.ok(Array.isArray(listRes.body.items));
  assert.equal(listRes.body.items.length, 2);
  assert.equal(listRes.body.hasMore, false);

  // DELETE /saved/:id success (200)
  const { deleteHandler } = createHandlers({
    deleteResult: { data: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, error: null },
  });
  const deleteRes = createRes();
  await deleteHandler({ method: 'DELETE', query: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } } as any, deleteRes as any);
  assert.equal(deleteRes.statusCode, 200);
  assert.deepEqual(deleteRes.body, { ok: true });

  // DELETE /saved/:id not found (404)
  const { deleteHandler: notFoundHandler } = createHandlers({
    deleteResult: { data: null, error: { code: 'PGRST116', message: 'No rows found' } },
  });
  const notFoundRes = createRes();
  await notFoundHandler({ method: 'DELETE', query: { id: 'missing-id' } } as any, notFoundRes as any);
  assert.equal(notFoundRes.statusCode, 404);
  assert.equal(notFoundRes.body.error, 'Not found');

  // DELETE /saved/:id forbidden via RLS (403)
  const { deleteHandler: forbiddenHandler } = createHandlers({
    deleteResult: {
      data: null,
      error: {
        code: '42501',
        message: 'new row violates row-level security policy for table "user_bookmarks"',
      },
    },
  });
  const forbiddenRes = createRes();
  await forbiddenHandler({ method: 'DELETE', query: { id: 'forbidden-id' } } as any, forbiddenRes as any);
  assert.equal(forbiddenRes.statusCode, 403);
  assert.equal(forbiddenRes.body.error, 'Forbidden');

  console.log('saved service endpoints tested');
})();
