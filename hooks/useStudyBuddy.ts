import { useCallback, useState } from 'react';
import type { StudySession, StudySessionItem } from '../types/innovation';

export function useStudyBuddy() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (userId: string | null, items: StudySessionItem[]) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/study-buddy/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, items }) });
      if (!res.ok) throw new Error('Failed to create session');
      const json = (await res.json()) as StudySession;
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
      const res = await fetch(`/api/study-buddy/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const json = (await res.json()) as StudySession;
      setSession(json);
      return json;
    } catch (e) {
      throw e;
    }
  }, []);

  const start = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/study-buddy/sessions/${id}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start');
      return true;
    } catch (e) {
      throw e;
    }
  }, []);

  return { loading, error, session, createSession, refresh, start } as const;
}
