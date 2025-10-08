import { describe, expect, it } from 'vitest';

import {
  countWords,
  deserializeDraft,
  markDraftSynced,
  serializeDraft,
  shouldSyncServer,
  type WritingDraftRecord,
} from '../../../lib/storage/drafts';

describe('storage/drafts serializer', () => {
  const baseDraft: WritingDraftRecord = {
    attemptId: 'draft-1',
    startedAt: 1_000,
    updatedAt: 2_000,
    content: {
      task1: 'First task content',
      task2: 'Second task response',
      task1WordCount: 3,
      task2WordCount: 3,
    },
  };

  it('round-trips a draft', () => {
    const raw = serializeDraft(baseDraft);
    const parsed = deserializeDraft(raw);
    expect(parsed).toEqual(baseDraft);
  });

  it('ignores malformed payloads', () => {
    expect(deserializeDraft('not-json')).toBeNull();
    expect(deserializeDraft('{"attemptId": ""}')).toBeNull();
  });

  it('marks a draft as synced and prevents re-sync until updated', () => {
    const synced = markDraftSynced(baseDraft, 2_000);
    expect(shouldSyncServer(synced, 2_000 + 200_000)).toBe(false);

    const updated: WritingDraftRecord = { ...synced, updatedAt: synced.updatedAt + 10_000 };
    const almostThreeMinutes = updated.startedAt + 180_000 - 1;
    expect(shouldSyncServer(updated, almostThreeMinutes)).toBe(false);
    expect(shouldSyncServer(updated, almostThreeMinutes + 2)).toBe(true);
  });

  it('counts words robustly', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(' one  two three ')).toBe(3);
    expect(countWords('\n spaced\nwords \t tabs')).toBe(3);
  });
});
