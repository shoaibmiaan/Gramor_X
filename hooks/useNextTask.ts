import useSWR from 'swr';

export type NextTaskModule = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocab';
export type NextTaskType = 'drill' | 'mock' | 'lesson' | 'review';

export type NextTaskEvidence = {
  headline: string;
  detail?: string;
};

export type NextTaskPayload = {
  id: string;
  slug: string;
  module: NextTaskModule;
  type: NextTaskType;
  estMinutes: number;
  difficulty: string | null;
  tags: string[];
  minPlan: string;
  deeplink: string;
  title: string;
  summary: string | null;
};

export type NextTaskResponse = {
  recommendationId: string | null;
  task: NextTaskPayload | null;
  reason: string | null;
  score: number | null;
  evidence: NextTaskEvidence[];
};

async function fetchNextTask(url: string): Promise<NextTaskResponse> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401) {
      return { recommendationId: null, task: null, reason: null, score: null, evidence: [] };
    }
    throw new Error(`Failed to fetch next task: ${res.status}`);
  }
  const data = (await res.json()) as NextTaskResponse;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid next task response');
  }
  return {
    recommendationId: data.recommendationId ?? null,
    task: data.task ?? null,
    reason: data.reason ?? null,
    score: data.score ?? null,
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
  };
}

export function useNextTask() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<NextTaskResponse>(
    '/api/reco/next-task',
    fetchNextTask,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const loading = (isLoading || isValidating) && !data && !error;

  return {
    recommendationId: data?.recommendationId ?? null,
    task: data?.task ?? null,
    reason: data?.reason ?? null,
    score: data?.score ?? null,
    evidence: data?.evidence ?? [],
    loading,
    error: error ?? null,
    refresh: mutate,
  };
}

export default useNextTask;
