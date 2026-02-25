import useSWR from 'swr';
import { fetcher } from '@/lib/fetch';
import type { DashboardPayload } from '@/lib/reading/types';

export function useDashboardData() {
  const { data, error, isLoading } = useSWR<DashboardPayload>(
    '/api/reading/dashboard',
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, isLoading, error };
}