import { useCallback, useEffect, useState } from 'react';
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

  const broadcast = useCallback((value: number) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('streak:changed', { detail: { value } }));
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchStreak();
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
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, [broadcast, state.lastDayKey, state.shields]);

  const claimShield = useCallback(async () => {
    try {
      const data = await apiClaimShield();
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
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, [broadcast]);

  const useShield = useCallback(async () => {
    try {
      const data = await incrementStreak({ useShield: true });
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
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, [broadcast]);

  const scheduleRecovery = useCallback(async (date: string) => {
    try {
      const data = await apiScheduleRecovery(date);
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
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, [broadcast]);

  return { ...state, reload: load, completeToday, claimShield, useShield, scheduleRecovery };
}
