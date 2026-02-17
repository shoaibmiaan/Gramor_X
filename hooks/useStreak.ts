import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchStreak,
  incrementStreak,
  claimShield as apiClaimShield,
  scheduleRecovery as apiScheduleRecovery,
  getDayKeyInTZ,
} from '@/lib/streak';

export type StreakState = {
  loading: boolean;
  current: number;
  longest: number;
  lastDayKey: string | null;
  nextRestart: string | null;
  shields: number;
  error: string | null;
};

export function useStreak() {
  const [state, setState] = useState<StreakState>({
    loading: true,
    current: 0,
    longest: 0,
    lastDayKey: null,
    nextRestart: null,
    shields: 0,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleExternalUpdate = (event: Event) => {
      const maybeCustom = event as CustomEvent<{ value?: unknown }>;
      const nextValue = maybeCustom?.detail?.value;
      if (typeof nextValue !== 'number' || Number.isNaN(nextValue) || !mountedRef.current) {
        return;
      }

      setState((s) => ({
        ...s,
        loading: false,
        current: nextValue,
        longest: Math.max(s.longest, nextValue),
        error: null,
      }));
    };

    window.addEventListener('streak:changed', handleExternalUpdate as EventListener);
    return () => {
      window.removeEventListener('streak:changed', handleExternalUpdate as EventListener);
    };
  }, []);

  const broadcast = useCallback((value: number) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('streak:changed', { detail: { value } }));
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchStreak();
      if (!mountedRef.current) return;
      setState({
        loading: false,
        current: data.current_streak ?? 0,
        longest: data.longest_streak ?? data.current_streak ?? 0,
        lastDayKey: data.last_activity_date ?? null,
        nextRestart: data.next_restart_date ?? null,
        shields: data.shields ?? 0,
        error: null,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load';
      if (!mountedRef.current) return;
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const completeToday = useCallback(async () => {
    try {
      const today = getDayKeyInTZ();
      const yesterday = getDayKeyInTZ(new Date(Date.now() - 864e5));
      const shouldUseShield =
        state.lastDayKey !== today && state.lastDayKey !== yesterday && state.shields > 0;

      const data = await incrementStreak({ useShield: shouldUseShield });
      if (!mountedRef.current) return data;
      let nextCurrent = 0;
      setState((s) => {
        const currentValue = data.current_streak ?? s.current;
        nextCurrent = currentValue;
        return {
          ...s,
          current: currentValue,
          longest: data.longest_streak ?? s.longest,
          lastDayKey: data.last_activity_date ?? s.lastDayKey,
          nextRestart: data.next_restart_date ?? s.nextRestart,
          shields: data.shields ?? s.shields,
          error: null,
        };
      });
      broadcast(nextCurrent);
      return data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update';
      if (mountedRef.current) {
        setState((s) => ({ ...s, error: message }));
      }
      throw e;
    }
  }, [broadcast, state.lastDayKey, state.shields]);

  const claimShield = useCallback(async () => {
    try {
      const data = await apiClaimShield();
      if (!mountedRef.current) return;
      let nextCurrent = 0;
      setState((s) => {
        const currentValue = data.current_streak ?? s.current;
        nextCurrent = currentValue;
        return {
          ...s,
          shields: data.shields ?? s.shields,
          current: currentValue,
          longest: data.longest_streak ?? s.longest,
          lastDayKey: data.last_activity_date ?? s.lastDayKey,
          nextRestart: data.next_restart_date ?? s.nextRestart,
          error: null,
        };
      });
      broadcast(nextCurrent);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to claim';
      if (mountedRef.current) {
        setState((s) => ({ ...s, error: message }));
      }
      throw e;
    }
  }, [broadcast]);

  const useShield = useCallback(async () => {
    try {
      const data = await incrementStreak({ useShield: true });
      if (!mountedRef.current) return;
      let nextCurrent = 0;
      setState((s) => {
        const currentValue = data.current_streak ?? s.current;
        nextCurrent = currentValue;
        return {
          ...s,
          current: currentValue,
          longest: data.longest_streak ?? s.longest,
          lastDayKey: data.last_activity_date ?? s.lastDayKey,
          nextRestart: data.next_restart_date ?? s.nextRestart,
          shields: data.shields ?? s.shields,
          error: null,
        };
      });
      broadcast(nextCurrent);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to use';
      if (mountedRef.current) {
        setState((s) => ({ ...s, error: message }));
      }
      throw e;
    }
  }, [broadcast]);

  const scheduleRecovery = useCallback(async (date: string) => {
    try {
      const data = await apiScheduleRecovery(date);
      if (!mountedRef.current) return;
      let nextCurrent = 0;
      setState((s) => {
        const currentValue = data.current_streak ?? s.current;
        nextCurrent = currentValue;
        return {
          ...s,
          current: currentValue,
          longest: data.longest_streak ?? s.longest,
          lastDayKey: data.last_activity_date ?? s.lastDayKey,
          nextRestart: data.next_restart_date ?? s.nextRestart,
          shields: data.shields ?? s.shields,
          error: null,
        };
      });
      broadcast(nextCurrent);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to schedule recovery';
      if (mountedRef.current) {
        setState((s) => ({ ...s, error: message }));
      }
      throw e;
    }
  }, [broadcast]);

  return { ...state, reload: load, completeToday, claimShield, useShield, scheduleRecovery };
}
