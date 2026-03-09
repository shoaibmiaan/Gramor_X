import useSWR from 'swr';

import type { ActiveSubscription } from '@/lib/subscription';

type SubscriptionResponse = {
  ok: boolean;
  active: boolean;
  subscription: ActiveSubscription | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return (await res.json()) as SubscriptionResponse;
};

export function useSubscription() {
  const state = useSWR('/api/subscription/active', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    subscription: state.data?.subscription ?? null,
    active: state.data?.active ?? false,
    loading: (!state.data && !state.error) || state.isLoading,
    error: state.error,
    refresh: state.mutate,
  };
}
