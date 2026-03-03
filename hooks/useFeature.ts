import useSWR from 'swr';

export function useFeature(featureName: string) {
  const { data, error, isLoading, mutate } = useSWR(
    featureName ? `/api/debug/feature-flags` : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch flags');
      return response.json();
    },
    { revalidateOnFocus: false },
  );

  return {
    enabled: Boolean(data?.flags?.[featureName]),
    isLoading,
    error: error as Error | null,
    refresh: mutate,
  };
}
