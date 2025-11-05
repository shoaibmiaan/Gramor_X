import { useCallback, useState } from 'react';
import type { AICoachResponse } from '../types/innovation';
import { fetchAICoach, sendAICoachAction } from '../lib/aiClient';

export function useAICoach() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AICoachResponse | null>(null);

  const run = useCallback(async (userId: string | null, context: string, goal?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAICoach(userId, context, goal);
      setResponse(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? 'AI coach error');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const doAction = useCallback(async (suggestionId: string, userId?: string | null) => {
    try {
      await sendAICoachAction(suggestionId, userId ?? null);
    } catch (e) {
      // surface but don't crash
      console.error('coach action failed', e);
    }
  }, []);

  return { loading, error, response, run, doAction } as const;
}
