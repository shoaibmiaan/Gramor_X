// tests/api/streak.test.ts
import { strict as assert } from 'node:assert';

type QueueKey = 'select' | 'upsert' | 'update' | 'insert';

type TableQueues = Record<
  string,
  {
    [key in QueueKey]?: Array<Record<string, any>>;
  }
>;

type SupabaseStubConfig = {
  user?: { id: string } | null;
  authError?: Error | null;
  responses?: TableQueues;
  captured?: Array<Record<string, any>>;
};

function cloneQueues(responses: TableQueues | undefined): TableQueues {
  if (!responses) return {};
  return Object.fromEntries(
    Object.entries(responses).map(([table, queues]) => [
      table,
      {
        select: queues.select ? [...queues.select] : [],
        upsert: queues.upsert ? [...queues.upsert] : [],
        update: queues.update ? [...queues.update] : [],
        insert: queues.insert ? [...queues.insert] : [],
      },
    ]),
  );
}

function createSupabaseStub(config: SupabaseStubConfig) {
  const queues = cloneQueues(config.responses);
  const captured = config.captured;

  const shift = (table: string, key: QueueKey) => {
    const tableQueues = queues[table] ?? (queues[table] = {} as any);
    const arr = (tableQueues[key] ??= []);
    if (arr.length === 0) return {} as Record<string, any>;
    return arr.shift() ?? ({} as Record<string, any>);
  };

  const buildSelectChain = (table: string) => {
    const result = shift(table, 'select');
    const chain: any = {
      eq() {
        return chain;
      },
      gte() {
        return Promise.resolve(result);
      },
      maybeSingle() {
        return Promise.resolve(result);
      },
      single() {
        return Promise.resolve(result);
      },
    };
    return chain;
  };

  const buildUpsertChain = (table: string, value: Record<string, any>, options: Record<string, any> | undefined) => {
    captured?.push({ table, op: 'upsert', value, options });
    const result = shift(table, 'upsert');
    return {
      select() {
        return {
          maybeSingle() {
            return Promise.resolve(result);
          },
          single() {
            return Promise.resolve(result);
          },
        };
      },
    };
  };

  const buildUpdateChain = (table: string, value: Record<string, any>) => {
    captured?.push({ table, op: 'update', value });
    const result = shift(table, 'update');
    return {
      eq() {
        return {
          select() {
            return {
              single() {
                return Promise.resolve(result);
              },
            };
          },
        };
      },
    };
  };

  return {
    auth: {
      async getUser() {
        if (config.authError) {
          return { data: { user: null }, error: config.authError };
        }
        if (!config.user) {
          return { data: { user: null }, error: null };
        }
        return { data: { user: config.user }, error: null };
      },
    },
    from(table: string) {
      return {
        select() {
          return buildSelectChain(table);
        },
        upsert(value: Record<string, any>, options?: Record<string, any>) {
          return buildUpsertChain(table, value, options);
        },
        update(value: Record<string, any>) {
          return buildUpdateChain(table, value);
        },
        insert(value: Record<string, any>) {
          captured?.push({ table, op: 'insert', value });
          const result = shift(table, 'insert');
          return Promise.resolve(result);
        },
      };
    },
  };
}

function createRes() {
  return {
    statusCode: 0,
    body: undefined as any,
    headers: new Map<string, any>(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: any) {
      this.headers.set(name, value);
    },
    getHeader(name: string) {
      return this.headers.get(name);
    },
  };
}

function loadHandler(config: SupabaseStubConfig) {
  const helperPath = require.resolve('../../lib/supabaseServer');
  const handlerPath = require.resolve('../../pages/api/streak');

  delete require.cache[helperPath];
  delete require.cache[handlerPath];

  require.cache[helperPath] = {
    exports: {
      getServerClient: () => createSupabaseStub(config),
    },
  } as any;

  const handler = require(handlerPath).default;

  return {
    handler,
    cleanup: () => {
      delete require.cache[helperPath];
      delete require.cache[handlerPath];
    },
  };
}

(async () => {
  {
    const { handler, cleanup } = loadHandler({ user: null });
    const res = createRes();
    await handler({ method: 'GET' } as any, res as any);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'not_authenticated');
    cleanup();
  }

  {
    const todayRow = {
      user_id: 'user-1',
      current_streak: 3,
      longest_streak: 5,
      last_activity_date: '2024-03-10',
      updated_at: '2024-03-10T12:00:00Z',
    };
    const { handler, cleanup } = loadHandler({
      user: { id: 'user-1' },
      responses: {
        streaks: {
          select: [{ data: todayRow, error: null }],
        },
        streak_shields: {
          select: [{ data: { tokens: 2 }, error: null }],
        },
      },
    });
    const res = createRes();
    await handler({ method: 'GET' } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      current_streak: 3,
      longest_streak: 5,
      last_activity_date: '2024-03-10',
      next_restart_date: null,
      shields: 2,
    });
    cleanup();
  }

  {
    const { handler, cleanup } = loadHandler({
      user: { id: 'user-claim' },
      responses: {
        streaks: {
          select: [
            {
              data: {
                user_id: 'user-claim',
                current_streak: 5,
                longest_streak: 5,
                last_activity_date: '2024-03-10',
                updated_at: '2024-03-10T12:00:00Z',
              },
              error: null,
            },
          ],
        },
        streak_shields: {
          select: [{ data: { tokens: 0 }, error: null }],
        },
      },
    });
    const res = createRes();
    await handler({ method: 'POST', body: { action: 'claim' } } as any, res as any);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Shield claim unavailable for current streak');
    cleanup();
  }

  {
    const captured: Array<Record<string, any>> = [];
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const { handler, cleanup } = loadHandler({
      user: { id: 'user-update' },
      responses: {
        streaks: {
          select: [
            {
              data: {
                user_id: 'user-update',
                current_streak: 0,
                longest_streak: 0,
                last_activity_date: null,
                updated_at: '1970-01-01T00:00:00Z',
              },
              error: null,
            },
          ],
          update: [
            {
              data: {
                user_id: 'user-update',
                current_streak: 1,
                longest_streak: 1,
                last_activity_date: todayKey,
                updated_at: now.toISOString(),
              },
              error: null,
            },
          ],
        },
        streak_shields: {
          select: [{ data: { tokens: 0 }, error: null }],
        },
      },
      captured,
    });

    const res = createRes();
    await handler({ method: 'POST', body: {} } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: todayKey,
      next_restart_date: null,
      shields: 0,
    });

    const updateCall = captured.find((entry) => entry.op === 'update');
    assert.ok(updateCall, 'Expected streak update call');
    assert.equal(updateCall.value.current, 1);
    assert.equal(updateCall.value.longest, 1);
    assert.equal(updateCall.value.last_active_date, todayKey);
    cleanup();
  }

  console.log('streak api scenarios covered');
})();

