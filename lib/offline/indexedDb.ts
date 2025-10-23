// lib/offline/indexedDb.ts
// IndexedDB helpers for storing offline drafts and exam events with migrations.

export const OFFLINE_DB_NAME = 'gramor-offline';
export const OFFLINE_DB_VERSION = 2;
export const DRAFT_STORE = 'drafts';
export const EVENT_STORE = 'events';

export type DraftTaskId = 'task1' | 'task2';

export type DraftTaskSnapshot = {
  content: string;
  wordCount: number;
};

export type DraftPayload = {
  tasks?: Partial<Record<DraftTaskId, DraftTaskSnapshot>>;
  activeTask?: DraftTaskId;
  elapsedSeconds?: number;
};

export interface StoredDraftRecord {
  id: string;
  kind: 'writing';
  attemptId: string;
  revision: number;
  updatedAt: number;
  queuedAt: number;
  payload: DraftPayload;
  schemaVersion: number;
}

export interface StoredEventRecord {
  id?: number;
  kind: 'writing';
  attemptId: string;
  eventType: 'focus' | 'blur' | 'typing';
  payload?: Record<string, unknown>;
  occurredAt: number;
  offlineId: string;
  schemaVersion: number;
}

const MIGRATIONS: Record<number, (db: IDBDatabase, tx: IDBTransaction) => void> = {
  1: (db) => {
    if (!db.objectStoreNames.contains(DRAFT_STORE)) {
      db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(EVENT_STORE)) {
      db.createObjectStore(EVENT_STORE, { keyPath: 'id', autoIncrement: true });
    }
  },
  2: (_db, tx) => {
    try {
      const draftStore = tx.objectStore(DRAFT_STORE);
      if (!draftStore.indexNames.contains('byAttempt')) {
        draftStore.createIndex('byAttempt', 'attemptId', { unique: false });
      }
      if (!draftStore.indexNames.contains('byUpdatedAt')) {
        draftStore.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
      }
    } catch (_err) {
      // Ignore failures when upgrading stores that may not yet exist.
    }

    try {
      const eventStore = tx.objectStore(EVENT_STORE);
      if (!eventStore.indexNames.contains('byAttempt')) {
        eventStore.createIndex('byAttempt', 'attemptId', { unique: false });
      }
      if (!eventStore.indexNames.contains('byOfflineId')) {
        eventStore.createIndex('byOfflineId', 'offlineId', { unique: false });
      }
    } catch (_err) {
      // Ignore upgrade failures gracefully.
    }
  },
};

let dbPromise: Promise<IDBDatabase> | null = null;

const hasIndexedDbSupport = () => typeof indexedDB !== 'undefined';

const debugWarn = (message: string, error: unknown) => {
  if (process.env.NODE_ENV === 'production') return;
  if (typeof console === 'undefined') return;
  // eslint-disable-next-line no-console
  console.warn(message, error);
};

const openDatabase = (): Promise<IDBDatabase> => {
  if (!hasIndexedDbSupport()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const tx = request.transaction;
        if (!tx) return;
        const oldVersion = event.oldVersion ?? 0;
        for (let version = oldVersion + 1; version <= OFFLINE_DB_VERSION; version += 1) {
          const migrate = MIGRATIONS[version];
          if (typeof migrate === 'function') {
            migrate(db, tx);
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onblocked = () => {
        // If another tab still has the DB open, close this connection attempt.
        reject(request.error ?? new Error('IndexedDB upgrade blocked'));
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
};

const openDatabaseSafe = async (): Promise<IDBDatabase | null> => {
  try {
    return await openDatabase();
  } catch (error) {
    debugWarn('[offline/indexedDb] open failed', error);
    return null;
  }
};

export const offlineDb = {
  async isSupported(): Promise<boolean> {
    if (!hasIndexedDbSupport()) return false;
    const db = await openDatabaseSafe();
    return Boolean(db);
  },

  async getDraft(id: string): Promise<StoredDraftRecord | null> {
    const db = await openDatabaseSafe();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFT_STORE, 'readonly');
      const store = tx.objectStore(DRAFT_STORE);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result as StoredDraftRecord | undefined;
        resolve(result ?? null);
      };
      request.onerror = () => resolve(null);
    });
  },

  async putDraft(record: StoredDraftRecord): Promise<void> {
    const db = await openDatabaseSafe();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to store draft record'));
      const store = tx.objectStore(DRAFT_STORE);
      store.put(record);
    }).catch((error) => {
      debugWarn('[offline/indexedDb] putDraft failed', error);
    });
  },

  async getAllDrafts(): Promise<StoredDraftRecord[]> {
    const db = await openDatabaseSafe();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFT_STORE, 'readonly');
      const store = tx.objectStore(DRAFT_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = Array.isArray(request.result) ? (request.result as StoredDraftRecord[]) : [];
        resolve(result);
      };
      request.onerror = () => resolve([]);
    });
  },

  async deleteDraft(id: string): Promise<void> {
    const db = await openDatabaseSafe();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete draft record'));
      tx.objectStore(DRAFT_STORE).delete(id);
    }).catch((error) => {
      debugWarn('[offline/indexedDb] deleteDraft failed', error);
    });
  },

  async addEvent(record: StoredEventRecord): Promise<StoredEventRecord | null> {
    const db = await openDatabaseSafe();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(EVENT_STORE, 'readwrite');
      const store = tx.objectStore(EVENT_STORE);
      const request = store.add(record);
      request.onsuccess = () => {
        resolve({ ...record, id: Number(request.result) });
      };
      request.onerror = () => resolve(null);
    });
  },

  async getEvents(): Promise<StoredEventRecord[]> {
    const db = await openDatabaseSafe();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(EVENT_STORE, 'readonly');
      const store = tx.objectStore(EVENT_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = Array.isArray(request.result) ? (request.result as StoredEventRecord[]) : [];
        resolve(result);
      };
      request.onerror = () => resolve([]);
    });
  },

  async deleteEvents(ids: number[]): Promise<void> {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const db = await openDatabaseSafe();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(EVENT_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete events'));
      const store = tx.objectStore(EVENT_STORE);
      for (const id of ids) {
        store.delete(id);
      }
    }).catch((error) => {
      debugWarn('[offline/indexedDb] deleteEvents failed', error);
    });
  },
};

export type OfflineDb = typeof offlineDb;
