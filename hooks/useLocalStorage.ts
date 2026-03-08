import { Dispatch, SetStateAction, useEffect, useState } from 'react';

type UseLocalStorageOptions<T> = {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  validate?: (value: unknown) => value is T;
};

const canUseStorage = () => typeof window !== 'undefined';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const { serialize = JSON.stringify, deserialize = JSON.parse, validate } = options;

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    if (!canUseStorage()) return;

    try {
      const item = window.localStorage.getItem(key);
      if (item == null) return;

      const parsed = deserialize(item) as unknown;
      if (validate && !validate(parsed)) {
        setStoredValue(initialValue);
        return;
      }

      setStoredValue(parsed as T);
    } catch {
      setStoredValue(initialValue);
    }
  }, [key, initialValue, deserialize, validate]);

  useEffect(() => {
    if (!canUseStorage()) return;

    try {
      window.localStorage.setItem(key, serialize(storedValue));
    } catch {
      // Ignore write failures (e.g. quota/private mode)
    }
  }, [key, storedValue, serialize]);

  return [storedValue, setStoredValue];
}
