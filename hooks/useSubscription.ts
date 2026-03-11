import useSWR from 'swr';

import type { ActiveSubscription } from '@/lib/subscription';
import { api } from '@/lib/api';

type SubscriptionResponse = {
  ok: boolean;
  active: boolean;
  subscription: ActiveSubscription | null;
};

const fetcher = async () => {
  const { data } = await api.subscription.status();
  return data as SubscriptionResponse;
};

export function useSubscription() {
  const state = useSWR('/api/subscription/active', () => fetcher(), {
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
