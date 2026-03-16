import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearDraftByStepNumber,
  clearPendingSyncState,
  loadPendingSyncState,
  savePendingSyncState,
} from '@/lib/onboarding/draft';
import {
  fetchOnboardingState,
  OnboardingConflictError,
  OnboardingNetworkError,
  saveOnboardingStep,
  type OnboardingSaveOptions,
} from '@/lib/onboarding/client';
import { useBeforeUnload } from './useBeforeUnload';

type UseAutoSaveParams<T extends Record<string, unknown> | null> = {
  step: number;
  data: T;
  enabled?: boolean;
  delay?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
};

type SyncState = 'synced' | 'saving' | 'pending' | 'offline';

type UseAutoSaveResult = {
  isSaving: boolean;
  isSaved: boolean;
  error: string | null;
  isConflict: boolean;
  conflictMessage: string | null;
  flush: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  clearError: () => void;
  reloadFromConflict: () => void;
  expectedVersion: string | null;
  hasPendingChanges: boolean;
  syncState: SyncState;
};

const MAX_RETRIES = 3;

export function useAutoSave<T extends Record<string, unknown> | null>({
  step,
  data,
  enabled = true,
  delay = 2000,
  onSave,
  onError,
}: UseAutoSaveParams<T>): UseAutoSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [expectedVersion, setExpectedVersion] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const dataRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequestIdRef = useRef(0);
  const hasMountedRef = useRef(false);
  const pendingRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  dataRef.current = data;

  useBeforeUnload(
    hasPendingChanges,
    'You have unsaved onboarding changes. Are you sure you want to leave?',
  );

  useEffect(() => {
    const existingPending = loadPendingSyncState(step);
    if (existingPending?.pending) {
      setHasPendingChanges(true);
      setError(existingPending.lastError || 'Changes not saved yet.');
    }
  }, [step]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const state = await fetchOnboardingState();
        if (active) setExpectedVersion(state.updatedAt ?? null);
      } catch {
        // best effort
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const saveNow = useCallback(
    async (retryAttempt = 0) => {
      if (!enabled) return false;

      const requestId = ++latestRequestIdRef.current;
      setIsSaving(true);
      setIsSaved(false);
      setError(null);
      setHasPendingChanges(true);
      savePendingSyncState(step, dataRef.current, null);

      try {
        const options: OnboardingSaveOptions = { expectedVersion };
        const response = await saveOnboardingStep(step, dataRef.current, options);

        if (latestRequestIdRef.current === requestId) {
          setExpectedVersion(response.updatedAt ?? null);
          setIsConflict(false);
          setConflictMessage(null);
          setIsSaved(true);
          setHasPendingChanges(false);
          clearPendingSyncState(step);
          clearDraftByStepNumber(step);
          onSave?.();
        }

        return true;
      } catch (rawError) {
        if (latestRequestIdRef.current === requestId) {
          if (rawError instanceof OnboardingConflictError) {
            setIsConflict(true);
            setConflictMessage(
              rawError.message ||
                'Your data has been updated in another session. Please reload to see the latest version.',
            );
            setExpectedVersion(rawError.latestState?.updatedAt ?? null);
            setError(rawError.message);
            savePendingSyncState(step, dataRef.current, rawError.message);
          } else {
            const err = rawError instanceof Error ? rawError : new Error('Auto-save failed');
            setError(err.message);
            savePendingSyncState(step, dataRef.current, err.message);
            console.error('[onboarding:auto-save:error]', {
              step,
              message: err.message,
              retryAttempt,
            });
            onError?.(err);

            const canRetry =
              retryAttempt < MAX_RETRIES && (err instanceof OnboardingNetworkError || !isConflict);
            if (canRetry) {
              const backoff = Math.pow(2, retryAttempt) * 1000;
              pendingRetryTimeoutRef.current = setTimeout(() => {
                void saveNow(retryAttempt + 1);
              }, backoff);
            }
          }
        }

        return false;
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setIsSaving(false);
        }
      }
    },
    [enabled, expectedVersion, isConflict, onError, onSave, step],
  );

  useEffect(() => {
    if (isOnline && hasPendingChanges && !isSaving && enabled) {
      void saveNow();
    }
  }, [enabled, hasPendingChanges, isOnline, isSaving, saveNow]);

  const dataSignature = useMemo(() => JSON.stringify(data), [data]);

  useEffect(() => {
    if (!enabled) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    setIsSaved(false);
    setHasPendingChanges(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void saveNow();
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [dataSignature, delay, enabled, saveNow]);

  useEffect(() => {
    return () => {
      if (pendingRetryTimeoutRef.current) clearTimeout(pendingRetryTimeoutRef.current);
    };
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    return saveNow();
  }, [saveNow]);

  const retry = useCallback(async () => saveNow(), [saveNow]);

  const clearError = useCallback(() => {
    setError(null);
    setConflictMessage(null);
    setIsConflict(false);
  }, []);

  const reloadFromConflict = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const syncState: SyncState = isSaving
    ? 'saving'
    : hasPendingChanges
      ? isOnline
        ? 'pending'
        : 'offline'
      : 'synced';

  return {
    isSaving,
    isSaved,
    error,
    isConflict,
    conflictMessage,
    flush,
    retry,
    clearError,
    reloadFromConflict,
    expectedVersion,
    hasPendingChanges,
    syncState,
  };
}
