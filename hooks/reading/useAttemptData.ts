import useSWR from 'swr';
import { fetcher } from '@/lib/fetch';
import type { AttemptDetails } from '@/lib/reading/types';

export function useAttemptData(attemptId: string) {
  const { data, error, isLoading } = useSWR<AttemptDetails>(
    attemptId ? `/api/mock/reading/result?attemptId=${attemptId}` : null,
    fetcher
  );

  return { data, isLoading, error };
}