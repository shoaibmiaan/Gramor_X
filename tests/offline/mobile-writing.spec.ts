import assert from 'node:assert/strict';
import test from 'node:test';

import {
  queueDraftForOffline,
  queueEventForOffline,
  replayOfflineQueue,
  __resetOfflineBackgroundRegistrationForTests as resetBackgroundRegistration,
  __setOfflineBackgroundSyncMocks as setBackgroundMocks,
} from '@/lib/offline/background-sync';

test('queueDraftForOffline queues the latest draft and requests sync', async () => {
  resetBackgroundRegistration();
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {};
  const queuedRecord = { id: 'attempt-1', revision: 3 } as any;
  const syncCalls: string[] = [];
  let ensureCalls = 0;
  let registerCalls = 0;

  setBackgroundMocks({
    queueDraft: async () => queuedRecord,
    ensureOrchestrator: () => {
      ensureCalls += 1;
      return { requestSync: (reason: string) => syncCalls.push(reason) } as any;
    },
    registerBackground: async () => {
      registerCalls += 1;
    },
  });

  const result = await queueDraftForOffline({
    attemptId: 'attempt-1',
    tasks: {},
    activeTask: undefined,
    elapsedSeconds: 42,
  });

  assert.strictEqual(result, queuedRecord);
  assert.deepStrictEqual(syncCalls, ['queued']);
  assert.strictEqual(ensureCalls, 1);
  assert.strictEqual(registerCalls, 1);

  resetBackgroundRegistration();
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
});

test('queueDraftForOffline returns null when IndexedDB is unavailable', async () => {
  resetBackgroundRegistration();
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {};
  let ensureCalls = 0;
  let registerCalls = 0;

  setBackgroundMocks({
    queueDraft: async () => null,
    ensureOrchestrator: () => {
      ensureCalls += 1;
      return { requestSync: () => undefined } as any;
    },
    registerBackground: async () => {
      registerCalls += 1;
    },
  });

  const result = await queueDraftForOffline({
    attemptId: 'attempt-x',
    tasks: {},
    activeTask: undefined,
    elapsedSeconds: 12,
  });

  assert.strictEqual(result, null);
  assert.strictEqual(ensureCalls, 0);
  assert.strictEqual(registerCalls, 0);

  resetBackgroundRegistration();
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
});

test('queueEventForOffline queues exam telemetry and triggers sync', async () => {
  resetBackgroundRegistration();
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {};
  const queuedEvent = { id: 99 } as any;
  const syncCalls: string[] = [];
  let ensureCalls = 0;
  let registerCalls = 0;

  setBackgroundMocks({
    queueEvent: async () => queuedEvent,
    ensureOrchestrator: () => {
      ensureCalls += 1;
      return { requestSync: (reason: string) => syncCalls.push(reason) } as any;
    },
    registerBackground: async () => {
      registerCalls += 1;
    },
  });

  const result = await queueEventForOffline({
    attemptId: 'attempt-1',
    eventType: 'focus',
    payload: { delta: 1 },
    occurredAt: 1234,
  });

  assert.strictEqual(result, queuedEvent);
  assert.deepStrictEqual(syncCalls, ['queued']);
  assert.strictEqual(ensureCalls, 1);
  assert.strictEqual(registerCalls, 1);

  resetBackgroundRegistration();
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
});

test('replayOfflineQueue proxies manual sync requests to the orchestrator', () => {
  resetBackgroundRegistration();
  const syncCalls: string[] = [];

  setBackgroundMocks({
    ensureOrchestrator: () => ({
      requestSync: (reason: string) => syncCalls.push(reason),
    }) as any,
  });

  replayOfflineQueue('online');
  assert.deepStrictEqual(syncCalls, ['online']);

  resetBackgroundRegistration();
});
