import useSWR from 'swr';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { DashboardPayload } from '@/lib/reading/types';

async function readingDashboardFetcher(url: string): Promise<DashboardPayload> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  const token = session?.access_token;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json() as Promise<DashboardPayload>;
}

export function useDashboardData() {
  const { data, error, isLoading } = useSWR<DashboardPayload>(
    '/api/reading/dashboard',
    readingDashboardFetcher,
    { revalidateOnFocus: false },
  );

  return { data, isLoading, error };
}
