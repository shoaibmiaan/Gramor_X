import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return (await res.json()) as { ok: boolean; access: boolean };
};

export function useFeatureAccess(feature: string) {
  const key = feature ? `/api/subscription/feature-access?feature=${encodeURIComponent(feature)}` : null;
  const state = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    access: state.data?.access ?? false,
    loading: (!!key && !state.data && !state.error) || state.isLoading,
    error: state.error,
    refresh: state.mutate,
  };
}
