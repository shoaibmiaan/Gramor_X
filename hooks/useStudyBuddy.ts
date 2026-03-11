import { useCallback, useState } from 'react';
import type { StudySession, StudySessionItem } from '../types/innovation';
import { api } from '@/lib/api';

export function useStudyBuddy() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (userId: string | null, items: StudySessionItem[]) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.studyBuddy.createSession({ userId, items });
      const json = data as StudySession;
      setSession(json);
      return json;
    } catch (e: any) {
      setError(e?.message ?? 'Create session failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (id: string) => {
    try {
      const { data } = await api.studyBuddy.getSession(id);
      const json = data as StudySession;
      setSession(json);
      return json;
    } catch (e) {
      throw e;
    }
  }, []);

  const start = useCallback(async (id: string) => {
    try {
      await api.studyBuddy.startSession(id);
      return true;
    } catch (e) {
      throw e;
    }
  }, []);

  return { loading, error, session, createSession, refresh, start } as const;
}
