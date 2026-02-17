// lib/mock/useAutoSaveDraft.ts
// Hook that wraps the autosave API with debouncing and visibility flushes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { saveWritingDraft } from '@/lib/writing/autosave';
import type { WritingTaskType } from '@/types/writing';

export type AutoSaveDraftState = 'idle' | 'saving' | 'saved' | 'error';

type AutoSaveTask = { content: string; wordCount: number };

type AutoSavePayload = {
  attemptId: string;
  tasks: Partial<Record<WritingTaskType, AutoSaveTask>>;
  activeTask: WritingTaskType;
  elapsedSeconds: number;
  enabled: boolean;
};

type UseAutoSaveDraftOptions = {
  attemptId: string;
  activeTask: WritingTaskType;
  tasks: Partial<Record<WritingTaskType, AutoSaveTask>>;
  elapsedSeconds: number;
  throttleMs?: number;
  enabled?: boolean;
};

export const useAutoSaveDraft = ({
  attemptId,
  activeTask,
  tasks,
  elapsedSeconds,
  throttleMs = 1500,
  enabled = true,
}: UseAutoSaveDraftOptions) => {
  const [state, setState] = useState<AutoSaveDraftState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const payload = useMemo<AutoSavePayload>(
    () => ({ attemptId, tasks, activeTask, elapsedSeconds, enabled }),
    [attemptId, tasks, activeTask, elapsedSeconds, enabled],
  );

  const debounced = useDebouncedCallback(async (current: AutoSavePayload) => {
    if (!current.enabled) return;
    if (!current.tasks.task1 && !current.tasks.task2) {
      if (mounted.current) setState('idle');
      return;
    }
    try {
      if (mounted.current) setState('saving');
      const { enabled: _enabled, ...request } = current;
      const response = await saveWritingDraft(request);
      if (mounted.current) {
        setState('saved');
        setLastSavedAt(response.savedAt ?? new Date().toISOString());
      }
    } catch (err) {
      console.error('[useAutoSaveDraft] failed to save draft', err);
      if (mounted.current) setState('error');
    }
  }, throttleMs, { maxWait: throttleMs * 2 });

  useEffect(() => {
    debounced(payload);
    return () => {
      debounced.flush();
    };
  }, [debounced, payload]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        debounced.flush();
      }
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('beforeunload', debounced.flush);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('beforeunload', debounced.flush);
    };
  }, [debounced]);

  const flush = useCallback(() => {
    debounced.flush();
  }, [debounced]);

  return { state, lastSavedAt, flush };
};
