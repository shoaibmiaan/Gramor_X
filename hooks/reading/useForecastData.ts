import useSWR from 'swr';
import { fetcher } from '@/lib/fetch';
import type { ForecastPayload } from '@/lib/reading/types';

export function useForecastData(targetBand: number = 7.0) {
  const { data, error, isLoading } = useSWR<ForecastPayload>(
    `/api/reading/forecast?target=${targetBand}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, isLoading, error };
}