// lib/offline/syncOrchestrator.ts
// Orchestrates syncing queued drafts/events with exponential backoff and network awareness.

import {
  listQueuedDrafts,
  listQueuedEvents,
  removeQueuedDraft,
  removeQueuedEvents,
} from '@/lib/offline/draftQueue';

export const DRAFT_SYNC_TAG = 'gramor-draft-sync';

const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60_000;
const MAX_DRAFTS_PER_BATCH = 5;
const MAX_EVENTS_PER_BATCH = 50;

const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

type SyncReason = 'manual' | 'online' | 'background' | 'retry' | 'queued';

type SyncResponse = {
  ok: boolean;
  syncedDraftIds?: string[];
  syncedEventIds?: number[];
};

const isBrowser = typeof window !== 'undefined';

const isOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine !== false : true);

const debugWarn = (message: string, error: unknown) => {
  if (process.env.NODE_ENV === 'production') return;
  if (typeof console === 'undefined') return;
  // eslint-disable-next-line no-console
  console.warn(message, error);
};

async function postBatch(payload: Record<string, unknown>): Promise<SyncResponse> {
  const res = await fetch('/api/offline/sync', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });

  if (!res.ok) {
    const message = await res
      .json()
      .then((data) => (typeof data?.error === 'string' ? data.error : res.statusText))
      .catch(() => res.statusText);
    const error = new Error(message || 'Sync request failed');
    (error as any).status = res.status;
    throw error;
  }

  return res
    .json()
    .then((data) => (typeof data === 'object' && data ? (data as SyncResponse) : { ok: true }))
    .catch(() => ({ ok: true }));
}

class DraftSyncOrchestrator {
  private syncing = false;
  private pending = false;
  private backoff = INITIAL_BACKOFF_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  constructor() {
    if (!isBrowser) return;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    if (!isBrowser) return;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
    }
    this.started = true;
  }

  private detachEventListeners() {
    if (!isBrowser || !this.started) return;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
    }
    this.started = false;
  }

  dispose() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.detachEventListeners();
  }

  requestSync(reason: SyncReason = 'manual') {
    if (!isBrowser) return;
    this.pending = true;
    if (!this.syncing) {
      void this.runSync(reason);
    }
  }

  private handleOnline = () => {
    this.requestSync('online');
  };

  private handleBeforeUnload = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  };

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    const data = event?.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'OFFLINE_SYNC' && data.tag === DRAFT_SYNC_TAG) {
      this.requestSync('background');
    }
  };

  private scheduleRetry() {
    if (this.retryTimer) return;
    const delay = this.backoff;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.requestSync('retry');
    }, delay);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
  }

  private resetBackoff() {
    this.backoff = INITIAL_BACKOFF_MS;
  }

  private async runSync(reason: SyncReason): Promise<void> {
    if (!isBrowser) return;
    if (!this.pending && reason === 'manual') return;
    if (this.syncing) return;

    this.syncing = true;
    this.pending = false;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    try {
      if (!isOnline()) {
        this.pending = true;
        return;
      }

      let madeProgress = false;

      while (true) {
        const [drafts, events] = await Promise.all([
          listQueuedDrafts(),
          listQueuedEvents(MAX_EVENTS_PER_BATCH),
        ]);

        const draftBatch = drafts.slice(0, MAX_DRAFTS_PER_BATCH);
        const eventBatch = events.slice(0, MAX_EVENTS_PER_BATCH);

        if (draftBatch.length === 0 && eventBatch.length === 0) {
          break;
        }

        const payload = {
          drafts: draftBatch.map((draft) => ({
            id: draft.id,
            kind: draft.kind,
            attemptId: draft.attemptId,
            revision: draft.revision,
            updatedAt: draft.updatedAt,
            payload: draft.payload,
          })),
          events: eventBatch.map((event) => ({
            id: event.id,
            kind: event.kind,
            attemptId: event.attemptId,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
            payload: event.payload,
            offlineId: event.offlineId,
          })),
        };

        const response = await postBatch(payload);
        const syncedDraftIds = new Set(response.syncedDraftIds ?? draftBatch.map((draft) => draft.id));
        const syncedEventIds = new Set(
          response.syncedEventIds ?? eventBatch.map((event) => event.id),
        );

        await Promise.all([
          ...draftBatch
            .filter((draft) => syncedDraftIds.has(draft.id))
            .map((draft) => removeQueuedDraft(draft.id)),
          syncedEventIds.size > 0 ? removeQueuedEvents(Array.from(syncedEventIds)) : Promise.resolve(),
        ]);

        madeProgress = true;

        if (draftBatch.length < MAX_DRAFTS_PER_BATCH && eventBatch.length <= MAX_EVENTS_PER_BATCH) {
          // Nothing left to sync in this loop.
          const remainingDrafts = drafts.length - draftBatch.length;
          const remainingEvents = events.length - eventBatch.length;
          if (remainingDrafts <= 0 && remainingEvents <= 0) {
            break;
          }
        }
      }

      if (madeProgress) {
        this.resetBackoff();
      }
    } catch (error) {
      debugWarn('[offline/syncOrchestrator] sync failed', error);
      this.pending = true;
      const status = (error as any)?.status;
      if (status && status >= 400 && status < 500 && status !== 401) {
        // Drop problematic payloads to avoid infinite loops.
        const drafts = await listQueuedDrafts();
        await Promise.all(drafts.map((draft) => removeQueuedDraft(draft.id)));
      }
      this.scheduleRetry();
    } finally {
      this.syncing = false;
      if (this.pending && !this.retryTimer) {
        this.scheduleRetry();
      }
    }
  }
}

let orchestratorInstance: DraftSyncOrchestrator | null = null;

export function ensureDraftSyncOrchestrator(): DraftSyncOrchestrator | null {
  if (!isBrowser) return null;
  if (!orchestratorInstance) {
    orchestratorInstance = new DraftSyncOrchestrator();
  }
  return orchestratorInstance;
}

export async function registerDraftBackgroundSync(): Promise<void> {
  if (!isBrowser) return;
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(DRAFT_SYNC_TAG);
  } catch (error) {
    debugWarn('[offline/syncOrchestrator] failed to register background sync', error);
  }
}

export { queueWritingDraft, queueExamEvent } from '@/lib/offline/draftQueue';
