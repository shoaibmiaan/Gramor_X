import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveOnboardingStep } from '@/lib/onboarding/client';

type UseAutoSaveParams<T extends Record<string, unknown>> = {
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
  flush: () => Promise<boolean>;
  clearError: () => void;
};

export function useAutoSave<T extends Record<string, unknown>>({
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

  const dataRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequestIdRef = useRef(0);
  const hasMountedRef = useRef(false);

  dataRef.current = data;

  const saveNow = useCallback(async () => {
    if (!enabled) return false;

    const requestId = ++latestRequestIdRef.current;
    setIsSaving(true);
    setIsSaved(false);
    setError(null);

    try {
      await saveOnboardingStep(step, dataRef.current);

      if (latestRequestIdRef.current === requestId) {
        setIsSaved(true);
        onSave?.();
      }

      return true;
    } catch (rawError) {
      if (latestRequestIdRef.current === requestId) {
        const err = rawError instanceof Error ? rawError : new Error('Auto-save failed');
        setError(err.message);
        onError?.(err);
      }

      return false;
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsSaving(false);
      }
    }
  }, [enabled, onError, onSave, step]);

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

  const clearError = useCallback(() => setError(null), []);

  return {
    isSaving,
    isSaved,
    error,
    flush,
    clearError,
  };
}
