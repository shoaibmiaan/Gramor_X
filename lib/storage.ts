/**
 * Safe localStorage wrapper – checks for window existence and handles SSR.
 * All keys are automatically prefixed to avoid collisions.
 */

const PREFIX = 'gramorx_'; // Change to your app's prefix

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(`${PREFIX}${key}`, serialized);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function getLocalStorage<T>(key: string, defaultValue: T | null = null): T | null {
  if (!isBrowser()) return defaultValue;
  try {
    const item = localStorage.getItem(`${PREFIX}${key}`);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

export function removeLocalStorage(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

export function clearLocalStorage(): void {
  if (!isBrowser()) return;
  try {
    // Only remove keys with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

// Specific helpers for your auth flow
export const storageKeys = {
  SELECTED_ROLE: 'selectedRole',
  PKCE_VERIFIER: 'pkce_verifier',
  // add other keys as needed
} as const;

// Type‑safe getters/setters for common keys
export const getSelectedRole = () => getLocalStorage<string>(storageKeys.SELECTED_ROLE);
export const setSelectedRole = (role: string) => setLocalStorage(storageKeys.SELECTED_ROLE, role);
export const removeSelectedRole = () => removeLocalStorage(storageKeys.SELECTED_ROLE);

export const getPkceVerifier = () => getLocalStorage<string>(storageKeys.PKCE_VERIFIER);
export const setPkceVerifier = (verifier: string) => setLocalStorage(storageKeys.PKCE_VERIFIER, verifier);
export const removePkceVerifier = () => removeLocalStorage(storageKeys.PKCE_VERIFIER);