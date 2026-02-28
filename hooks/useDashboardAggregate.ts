import useSWR from 'swr';
import type { DashboardAggregate } from '@/lib/services/dashboardService';

type DashboardAggregateResponse = {
  ok: boolean;
  aggregate: DashboardAggregate;
};

async function fetchDashboardAggregate(url: string): Promise<DashboardAggregateResponse> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Dashboard aggregate request failed (${response.status})`);
  }
  return (await response.json()) as DashboardAggregateResponse;
}

export function useDashboardAggregate(enabled = true, suspense = false) {
  const swr = useSWR<DashboardAggregateResponse>(enabled ? '/api/dashboard/aggregate' : null, fetchDashboardAggregate, {
    revalidateOnFocus: false,
    suspense,
  });

  return {
    aggregate: swr.data?.aggregate ?? null,
    loading: swr.isLoading,
    error: swr.error ? swr.error.message : null,
    refresh: swr.mutate,
    suspenseEnabled: suspense,
  };
}

export default useDashboardAggregate;
