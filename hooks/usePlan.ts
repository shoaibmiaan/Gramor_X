import useSWR from 'swr';

import type { PlanId } from '@/types/pricing';

type PlanResponse = { ok: boolean; plan: PlanId };

async function fetchPlan(url: string): Promise<PlanResponse> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to fetch plan: ${res.status}`);
  }
  const data = (await res.json()) as PlanResponse;
  if (!data || typeof data.plan !== 'string') {
    throw new Error('Invalid plan response');
  }
  return data;
}

export function usePlan(initialPlan?: PlanId) {
  const { data, error, isLoading, mutate, isValidating } = useSWR<PlanResponse>(
    '/api/me/plan',
    fetchPlan,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      fallbackData: initialPlan ? { ok: true, plan: initialPlan } : undefined,
    },
  );

  const plan = data?.plan ?? initialPlan ?? 'free';
  const loading = (isLoading || isValidating) && !data && !error;

  return {
    plan,
    loading,
    error,
    refresh: mutate,
  };
}

export default usePlan;
