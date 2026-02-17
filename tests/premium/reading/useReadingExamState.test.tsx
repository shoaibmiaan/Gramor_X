import { describe, expect, it, vi } from 'vitest';

import {
  ensureAttemptId,
  hasProgress,
  persistSnapshotOnce,
  safeParse,
} from '../../../premium-ui/exam/useReadingExamState';

describe('reading exam persistence helpers', () => {
  it('parses valid stored snapshot', () => {
    const raw = JSON.stringify({
      snapshot: {
        slug: 'sample',
        version: 1,
        answers: { q1: 'A' },
        currentQuestion: 2,
        passageIndex: 1,
        secondsRemaining: 500,
      },
      savedAt: '2024-01-01T00:00:00.000Z',
    });
    const parsed = safeParse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.snapshot.answers.q1).toBe('A');
    expect(parsed?.savedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns null when stored snapshot is malformed', () => {
    expect(safeParse('{"invalid":true}')).toBeNull();
    expect(safeParse(null)).toBeNull();
  });

  it('detects when a snapshot has meaningful progress', () => {
    expect(
      hasProgress({
        slug: 's',
        version: 1,
        answers: { q1: 'A' },
        currentQuestion: 1,
        passageIndex: 0,
        secondsRemaining: null,
      }),
    ).toBe(true);
    expect(
      hasProgress({
        slug: 's',
        version: 1,
        answers: {},
        currentQuestion: 1,
        passageIndex: 0,
        secondsRemaining: null,
      }),
    ).toBe(false);
  });

  it('persists snapshot to storage and posts event payload', async () => {
    const setItem = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const payload = {
      snapshot: {
        slug: 'sample',
        version: 1,
        answers: { q1: 'A' },
        currentQuestion: 3,
        passageIndex: 2,
        secondsRemaining: 420,
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    } as const;

    await persistSnapshotOnce({
      storage: { setItem },
      storageKey: 'key',
      attemptId: 'attempt-1',
      slug: 'sample',
      payload,
      fetcher: fetchMock as unknown as typeof fetch,
    });

    expect(setItem).toHaveBeenCalledWith('key', JSON.stringify(payload));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/exam/attempt-1/event',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.payload.snapshot.answers.q1).toBe('A');
    expect(body.payload.slug).toBe('sample');
  });

  it('generates attempt ids when none stored', () => {
    const first = ensureAttemptId();
    const second = ensureAttemptId();
    expect(first).not.toBe(second);
  });
});
