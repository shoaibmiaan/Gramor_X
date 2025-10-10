export type AutosaveSnapshot<T> = {
  data: T;
  updatedAt: string;
  version: number;
};

export type AutosaveListener<T> = (snapshot: AutosaveSnapshot<T> | null) => void;

export interface AutosaveSession<T> {
  key: string;
  version: number;
  load: () => AutosaveSnapshot<T> | null;
  save: (data: T) => AutosaveSnapshot<T>;
  patch: (partial: Partial<T>) => AutosaveSnapshot<T>;
  clear: () => void;
  subscribe: (listener: AutosaveListener<T>) => () => void;
}

export interface GlobalAutosaveRegistry {
  register: (session: AutosaveSession<any>) => void;
  get: (key: string) => AutosaveSession<any> | undefined;
  keys: () => string[];
  snapshot: (key: string) => AutosaveSnapshot<any> | null;
  clear: (key: string) => void;
}

type AnyListener = AutosaveListener<any>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEY_PREFIX = 'autosave:';

const listeners = new Map<string, Set<AnyListener>>();

const getStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

const parseSnapshot = <T,>(raw: string | null, version: number): AutosaveSnapshot<T> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as { data?: unknown; version?: number; updatedAt?: string } & Record<string, unknown>;
      const parsedVersion = typeof candidate.version === 'number' ? candidate.version : undefined;
      if (parsedVersion != null && parsedVersion !== version) {
        return null;
      }
      const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : nowIso();
      if (candidate.data && typeof candidate.data === 'object') {
        return { data: candidate.data as T, updatedAt, version };
      }
      return { data: parsed as T, updatedAt, version };
    }
  } catch {
    return null;
  }
  return null;
};

const notify = <T,>(key: string, snapshot: AutosaveSnapshot<T> | null) => {
  const subs = listeners.get(key);
  if (!subs || subs.size === 0) return;
  subs.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore listener errors
    }
  });
};

const writeSnapshot = <T,>(key: string, snapshot: AutosaveSnapshot<T> | null) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (snapshot) {
      storage.setItem(key, JSON.stringify(snapshot));
    } else {
      storage.removeItem(key);
    }
  } catch {
    // ignore storage failures
  }
};

const ensureRegistry = (): GlobalAutosaveRegistry | null => {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { __GRAMOR_AUTOSAVE__?: GlobalAutosaveRegistry };
  if (w.__GRAMOR_AUTOSAVE__) return w.__GRAMOR_AUTOSAVE__;
  const sessions = new Map<string, AutosaveSession<any>>();
  const registry: GlobalAutosaveRegistry = {
    register: (session) => {
      sessions.set(session.key, session);
    },
    get: (key) => sessions.get(key),
    keys: () => Array.from(sessions.keys()),
    snapshot: (key) => sessions.get(key)?.load() ?? null,
    clear: (key) => sessions.get(key)?.clear(),
  };
  Object.defineProperty(w, '__GRAMOR_AUTOSAVE__', {
    configurable: true,
    value: registry,
  });
  return registry;
};

export const autosaveStorageKey = (scope: string, id: string) => `${KEY_PREFIX}${scope}:${id}`;

type SessionOptions = {
  scope: string;
  id: string;
  version?: number;
  legacyKeys?: string[];
};

export function createAutosaveSession<T>(options: SessionOptions): AutosaveSession<T> {
  const version = options.version ?? 1;
  const key = autosaveStorageKey(options.scope, options.id);
  const legacyKeys = options.legacyKeys ?? [];

  const loadFrom = (storageKey: string): AutosaveSnapshot<T> | null => {
    const storage = getStorage();
    if (!storage) return null;
    let raw: string | null = null;
    try {
      raw = storage.getItem(storageKey);
    } catch {
      raw = null;
    }
    const snapshot = parseSnapshot<T>(raw, version);
    if (snapshot && storageKey !== key) {
      // migrate legacy payloads to the canonical key
      try {
        storage.setItem(key, JSON.stringify(snapshot));
        storage.removeItem(storageKey);
      } catch {
        // ignore migration failures
      }
    }
    return snapshot;
  };

  const load = () => {
    const primary = loadFrom(key);
    if (primary) return primary;
    for (const legacyKey of legacyKeys) {
      const migrated = loadFrom(legacyKey);
      if (migrated) return migrated;
    }
    return null;
  };

  const save = (data: T) => {
    const snapshot: AutosaveSnapshot<T> = { data, updatedAt: nowIso(), version };
    writeSnapshot(key, snapshot);
    notify(key, snapshot);
    return snapshot;
  };

  const patch = (partial: Partial<T>) => {
    const current = load()?.data ?? ({} as T);
    const next = { ...current, ...partial } as T;
    return save(next);
  };

  const clear = () => {
    writeSnapshot<T>(key, null);
    notify<T>(key, null);
  };

  const subscribe = (listener: AutosaveListener<T>) => {
    const set = listeners.get(key) ?? new Set<AnyListener>();
    set.add(listener as AnyListener);
    listeners.set(key, set);
    return () => {
      const curr = listeners.get(key);
      if (!curr) return;
      curr.delete(listener as AnyListener);
      if (curr.size === 0) listeners.delete(key);
    };
  };

  const session: AutosaveSession<T> = {
    key,
    version,
    load,
    save,
    patch,
    clear,
    subscribe,
  };

  ensureRegistry()?.register(session);

  return session;
}

declare global {
  interface Window {
    __GRAMOR_AUTOSAVE__?: GlobalAutosaveRegistry;
  }
}

export {};
