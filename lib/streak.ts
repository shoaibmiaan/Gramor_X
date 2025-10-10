import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type StreakState = {
  loading: boolean;
  current: number;
  longest: number;
  lastDayKey: string | null;
  nextRestart: string | null;
  shields: number;
  error: string | null;
};

// Utility functions for @/lib/streak
export const getDayKeyInTZ = (date: Date = new Date(), timeZone = 'Asia/Karachi'): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
};

export const fetchStreak = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('[fetchStreak] Session error:', sessionError?.message || 'No session');
      throw new Error('Unauthorized');
    }
    const res = await fetch('/api/streak', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      console.error('[fetchStreak] API error:', res.status, res.statusText);
      throw new Error(`Failed to fetch streak: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.error('[fetchStreak] Unexpected error:', err);
    throw err;
  }
};

export const incrementStreak = async ({ useShield = false }: { useShield?: boolean }) => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('[incrementStreak] Session error:', sessionError?.message || 'No session');
      throw new Error('Unauthorized');
    }
    const res = await fetch('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: useShield ? 'use' : undefined }),
    });
    if (!res.ok) {
      console.error('[incrementStreak] API error:', res.status, res.statusText);
      throw new Error(`Failed to increment streak: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.error('[incrementStreak] Unexpected error:', err);
    throw err;
  }
};

export const claimShield = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('[claimShield] Session error:', sessionError?.message || 'No session');
      throw new Error('Unauthorized');
    }
    const res = await fetch('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'claim' }),
    });
    if (!res.ok) {
      console.error('[claimShield] API error:', res.status, res.statusText);
      throw new Error(`Failed to claim shield: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.error('[claimShield] Unexpected error:', err);
    throw err;
  }
};

export const scheduleRecovery = async (date: string) => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('[scheduleRecovery] Session error:', sessionError?.message || 'No session');
      throw new Error('Unauthorized');
    }
    const res = await fetch('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'schedule', date }),
    });
    if (!res.ok) {
      console.error('[scheduleRecovery] API error:', res.status, res.statusText);
      throw new Error(`Failed to schedule recovery: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.error('[scheduleRecovery] Unexpected error:', err);
    throw err;
  }
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

  const load = useCallback(async () => {
    let mounted = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await Promise.race([
        fetchStreak(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Streak fetch timed out after 10s')), 10000)
        ),
      ]);
      if (!mounted) return;
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
      const message = e instanceof Error ? e.message : 'Failed to load streak';
      console.error('[useStreak] Load error:', message);
      if (!mounted) return;
      setState((s) => ({ ...s, loading: false, error: message }));
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    load().then((cleanup) => {
      if (!mounted) return;
      return () => { cleanup && cleanup(); };
    }).catch((err) => {
      console.error('[useStreak] useEffect error:', err);
      if (mounted) setState((s) => ({ ...s, loading: false, error: err.message || 'Failed to load streak' }));
    });
    return () => { mounted = false; };
  }, [load]);

  const completeToday = useCallback(async () => {
    try {
      const today = getDayKeyInTZ();
      const yesterday = getDayKeyInTZ(new Date(Date.now() - 864e5));
      const shouldUseShield =
        state.lastDayKey !== today && state.lastDayKey !== yesterday && state.shields > 0;

      const data = await incrementStreak({ useShield: shouldUseShield });
      setState((s) => ({
        ...s,
        current: data.current_streak ?? s.current,
        longest: data.longest_streak ?? s.longest,
        lastDayKey: data.last_activity_date ?? s.lastDayKey,
        nextRestart: data.next_restart_date ?? s.nextRestart,
        shields: data.shields ?? s.shields,
        error: null,
      }));
      return data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update streak';
      console.error('[useStreak] completeToday error:', message);
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, [state.lastDayKey, state.shields]);

  const claimShield = useCallback(async () => {
    try {
      const data = await claimShield();
      setState((s) => ({
        ...s,
        shields: data.shields ?? s.shields,
        current: data.current_streak ?? s.current,
        longest: data.longest_streak ?? s.longest,
        lastDayKey: data.last_activity_date ?? s.lastDayKey,
        nextRestart: data.next_restart_date ?? s.nextRestart,
        error: null,
      }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to claim shield';
      console.error('[useStreak] claimShield error:', message);
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, []);

  const useShield = useCallback(async () => {
    try {
      const data = await incrementStreak({ useShield: true });
      setState((s) => ({
        ...s,
        current: data.current_streak ?? s.current,
        longest: data.longest_streak ?? s.longest,
        lastDayKey: data.last_activity_date ?? s.lastDayKey,
        nextRestart: data.next_restart_date ?? s.nextRestart,
        shields: data.shields ?? s.shields,
        error: null,
      }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to use shield';
      console.error('[useStreak] useShield error:', message);
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, []);

  const scheduleRecoveryAction = useCallback(async (date: string) => {
    try {
      const data = await scheduleRecovery(date);
      setState((s) => ({
        ...s,
        current: data.current_streak ?? s.current,
        longest: data.longest_streak ?? s.longest,
        lastDayKey: data.last_activity_date ?? s.lastDayKey,
        nextRestart: data.next_restart_date ?? s.nextRestart,
        shields: data.shields ?? s.shields,
        error: null,
      }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to schedule recovery';
      console.error('[useStreak] scheduleRecovery error:', message);
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, []);

  return {
    ...state,
    reload: load,
    completeToday,
    claimShield,
    useShield,
    scheduleRecovery: scheduleRecoveryAction,
  };
}