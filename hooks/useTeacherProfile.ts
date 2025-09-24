import * as React from 'react';
import useSWR from 'swr';
import type { GetMyTeacherResponse } from '@/types/api/teacher';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useTeacherProfile() {
  const { data, error, isLoading, mutate } = useSWR<GetMyTeacherResponse>('/api/teacher/me', fetcher);
  return {
    profile: data?.profile ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
