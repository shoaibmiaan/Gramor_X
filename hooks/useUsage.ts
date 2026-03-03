import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'usage_fetch_failed' }));
    throw new Error(payload?.error ?? 'usage_fetch_failed');
  }
  return res.json();
};

export function useUsage(feature: string) {
  const { data, error, isLoading, mutate } = useSWR(feature ? `/api/usage/${encodeURIComponent(feature)}` : null, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  return {
    used: data?.used ?? 0,
    limit: data?.limit ?? 0,
    percentage: data?.percentage ?? 0,
    remaining: data?.remaining ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: mutate,
  };
}

export default useUsage;
