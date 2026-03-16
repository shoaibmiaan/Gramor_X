import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchOnboardingState,
  OnboardingConflictError,
  saveOnboardingStep,
  type OnboardingSaveOptions,
} from '@/lib/onboarding/client';

type UseAutoSaveParams<T extends Record<string, unknown> | null> = {
  step: number;
  data: T;
  enabled?: boolean;
  delay?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
};

type UseAutoSaveResult = {
  isSaving: boolean;
  isSaved: boolean;
  error: string | null;
  isConflict: boolean;
  conflictMessage: string | null;
  flush: () => Promise<boolean>;
  clearError: () => void;
  reloadFromConflict: () => void;
  expectedVersion: string | null;
};

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

  const dataRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequestIdRef = useRef(0);
  const hasMountedRef = useRef(false);

  dataRef.current = data;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const state = await fetchOnboardingState();
        if (active) setExpectedVersion(state.updatedAt ?? null);
      } catch {
        // noop: version prefetch is best-effort
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveNow = useCallback(async () => {
    if (!enabled) return false;

    const requestId = ++latestRequestIdRef.current;
    setIsSaving(true);
    setIsSaved(false);
    setError(null);

    try {
      const options: OnboardingSaveOptions = { expectedVersion };
      const response = await saveOnboardingStep(step, dataRef.current, options);

      if (latestRequestIdRef.current === requestId) {
        setExpectedVersion(response.updatedAt ?? null);
        setIsConflict(false);
        setConflictMessage(null);
        setIsSaved(true);
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
        } else {
          const err = rawError instanceof Error ? rawError : new Error('Auto-save failed');
          setError(err.message);
          onError?.(err);
        }
      }

      return false;
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsSaving(false);
      }
    }
  }, [enabled, expectedVersion, onError, onSave, step]);

  const dataSignature = useMemo(() => JSON.stringify(data), [data]);

  useEffect(() => {
    if (!enabled) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    setIsSaved(false);

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

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    return saveNow();
  }, [saveNow]);

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

  return {
    isSaving,
    isSaved,
    error,
    isConflict,
    conflictMessage,
    flush,
    clearError,
    reloadFromConflict,
    expectedVersion,
  };
}
