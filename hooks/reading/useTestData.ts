import useSWR from 'swr';
import { fetcher } from '@/lib/fetch';
import type { ReadingTest } from '@/lib/reading/types';

export function useTestData(slug: string) {
  const { data, error, isLoading } = useSWR<ReadingTest>(
    slug ? `/api/reading/test/${slug}` : null,
    fetcher
  );

  return { data, isLoading, error };
}