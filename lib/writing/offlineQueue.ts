import type { SaveDraftBody } from '@/lib/writing/schemas';

const STORAGE_KEY = 'gramor:writing-offline-drafts';

type OfflineDraft = SaveDraftBody & { updatedAt: number };

type DraftQueue = OfflineDraft[];

const isBrowser = typeof window !== 'undefined';

function readQueue(): DraftQueue {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftQueue;
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeQueue(queue: DraftQueue) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage failures
  }
}

export function enqueueOfflineDraft(payload: SaveDraftBody) {
  if (!isBrowser) return;
  const queue = readQueue();
  const filtered = queue.filter((draft) => draft.attemptId !== payload.attemptId);
  filtered.push({ ...payload, updatedAt: Date.now() });
  writeQueue(filtered);
}

export async function flushOfflineDrafts(sender: (payload: SaveDraftBody) => Promise<boolean>) {
  if (!isBrowser) return;
  const queue = readQueue().sort((a, b) => a.updatedAt - b.updatedAt);
  const remaining: DraftQueue = [];
  for (const draft of queue) {
    try {
      const ok = await sender(draft);
      if (!ok) {
        remaining.push(draft);
      }
    } catch {
      remaining.push(draft);
    }
  }
  writeQueue(remaining);
}
