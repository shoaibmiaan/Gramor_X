import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deserializeDraft,
  markDraftSynced,
  serializeDraft,
  shouldSyncServer,
  countWords,
  type WritingDraftRecord,
} from '../../../lib/storage/drafts';

test('serializeDraft/deserialiseDraft round trip preserves fields', () => {
  const draft: WritingDraftRecord = {
    attemptId: 'attempt-123',
    startedAt: 1000,
    updatedAt: 5000,
    syncedAt: 4000,
    content: {
      task1: 'Intro paragraph',
      task2: 'Body paragraph',
      task1WordCount: 2,
      task2WordCount: 2,
    },
  };

  const payload = serializeDraft(draft);
  const restored = deserializeDraft(payload);

  assert.deepEqual(restored, draft);
});

test('deserializeDraft sanitises malformed payloads', () => {
  const raw = JSON.stringify({
    v: 1,
    attemptId: 'draft-1',
    startedAt: 'not-a-number',
    updatedAt: null,
    content: {
      task1: ' Leading and trailing ',
      task2: '',
      task1WordCount: 'not numeric',
      task2WordCount: -4,
    },
  });

  const restored = deserializeDraft(raw);
  assert.ok(restored);
  assert.equal(restored?.attemptId, 'draft-1');
  assert.equal(restored?.startedAt > 0, true);
  assert.equal(restored?.content.task1.trim(), 'Leading and trailing');
  assert.equal(restored?.content.task2, '');
  assert.equal(restored?.content.task1WordCount, countWords(' Leading and trailing '));
  assert.equal(restored?.content.task2WordCount, 0);
});

test('markDraftSynced updates syncedAt and shouldSyncServer obeys thresholds', () => {
  const base: WritingDraftRecord = {
    attemptId: 'sync-1',
    startedAt: 0,
    updatedAt: 10_000,
    content: { task1: '', task2: '', task1WordCount: 0, task2WordCount: 0 },
  };

  const synced = markDraftSynced(base, 12_000);
  assert.equal(synced.syncedAt, 12_000);

  const soon = 60_000;
  assert.equal(shouldSyncServer({ ...synced, updatedAt: soon }, soon), false);

  const threshold = 3 * 60 * 1000 + 1;
  assert.equal(shouldSyncServer({ ...synced, updatedAt: threshold, syncedAt: threshold }, threshold), false);
  assert.equal(shouldSyncServer({ ...synced, updatedAt: threshold + 1000, syncedAt: threshold }, threshold + 1000), true);
});

test('countWords handles punctuation, unicode and dashes', () => {
  assert.equal(countWords("Hello, world! It's me—again."), 5);
  assert.equal(countWords('co-operate re-entry'), 4);
  assert.equal(countWords('  multiple\nlines   and\tspaces '), 4);
});
