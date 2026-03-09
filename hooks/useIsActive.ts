import { useSubscription } from '@/hooks/useSubscription';

export function useIsActive() {
  const { active, loading, error, refresh } = useSubscription();
  return { isActive: active, loading, error, refresh };
}
