'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { Icon } from '@/components/design-system/Icon';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser

type WOD = {
  word: { id: string; word: string; meaning: string; example: string | null };
  learnedToday: boolean;
  streakDays: number;
  streakValueUSD: number;
};

type HeroProps = {
  onStreakChange?: (n: number) => void;
};

export const Hero: React.FC<HeroProps> = ({ onStreakChange }) => {
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [data, setData] = useState<WOD | null>(null);
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<'unknown' | 'authed' | 'guest'>('unknown');

  useEffect(() => {
    setMounted(true);
    const t = new Date();
    t.setDate(t.getDate() + 7);
    setTarget(t);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = useMemo(() => {
    if (!target || !now) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const ms = Math.max(+target - +now, 0);
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return { days, hours, minutes, seconds };
  }, [target, now]);

  const load = useCallback(async (): Promise<WOD | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to get session:', error);
        setAuth('guest');
        setData(null);
        onStreakChange?.(0);
        return null;
      }
      const token = session?.access_token;
      if (!token) {
        setAuth('guest');
        setData(null);
        onStreakChange?.(0);
        return null;
      }
      setAuth('authed');
      const res = await fetch('/api/words/today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Failed to fetch word of the day:', res.status);
        setData(null);
        onStreakChange?.(0);
        return null;
      }
      const json: WOD = await res.json();
      setData(json);
      onStreakChange?.(json.streakDays ?? 0);
      try {
        window.dispatchEvent(
          new CustomEvent('streak:changed', { detail: { value: json.streakDays ?? 0 } })
        );
      } catch {}
      return json;
    } catch (err) {
      console.error('Error loading word of the day:', err);
      setAuth('guest');
      setData(null);
      onStreakChange?.(0);
      return null;
    }
  }, [onStreakChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const markLearned = async () => {
    if (!data || data.learnedToday) return;
    setBusy(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        console.error('No session for marking word learned:', error);
        setBusy(false);
        return;
      }
      const r = await fetch('/api/words/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ wordId: data.word.id }),
      });
      if (!r.ok) {
        console.error('Failed to mark word learned:', r.status);
      } else {
        const updated = await load();
        if (updated) {
          try {
            window.dispatchEvent(
              new CustomEvent('streak:changed', { detail: { value: updated.streakDays ?? 0 } })
            );
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error marking word learned:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative flex min-h-[100vh] items-center justify-center py-16 sm:py-24">
      <Container>
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h1 className="font-slab text-display sm:text-displayLg md:text-6xl font-bold leading-tight">
            <span className="text-gradient-primary">ACHIEVE YOUR DREAM IELTS SCORE WITH AI-POWERED PREP</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-h5 text-muted-foreground sm:text-h4">
            Master all four modules with adaptive paths, realistic mocks, and instant AI feedback.
          </p>

          {/* Countdown */}
          <Card className="mt-8 w-full rounded-2xl p-6 sm:inline-block sm:w-auto">
            <div className="mb-3 font-semibold text-primary">PRE-LAUNCH ACCESS IN</div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6" aria-live="polite">
              {(['Days', 'Hours', 'Minutes', 'Seconds'] as const).map((label, i) => {
                const v = [diff.days, diff.hours, diff.minutes, diff.seconds][i] || 0;
                return (
                  <div key={label} className="min-w-[5.5rem] text-center">
                    <div className="font-slab text-4xl font-bold text-gradient-vertical sm:text-display md:text-displayLg">
                      {String(v).padStart(2, '0')}
                    </div>
                    <div className="uppercase tracking-wide text-muted-foreground text-small mt-1">{label}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Word of the Day + streak */}
          <Card className="mx-auto mt-6 w-full max-w-md rounded-2xl p-6">
            <h3 className="text-primary font-semibold text-h3 mb-4">
              <Icon name="book" /> Word of the Day
            </h3>

            {auth === 'guest' && (
              <Alert variant="info" className="mb-4">
                Sign in to track your streak and unlock daily rewards.
              </Alert>
            )}

            {data ? (
              <>
                <div className="mb-4">
                  <h4 className="text-h1 mb-1 text-primary">{data.word.word}</h4>
                  <div className="text-body text-muted-foreground mb-3">{data.word.meaning}</div>
                  {data.word.example && (
                    <div className="italic text-muted-foreground border-l-4 pl-4 border-border">
                      “{data.word.example}”
                    </div>
                  )}
                </div>

                <Button
                  variant={data.learnedToday ? 'secondary' : 'accent'}
                  onClick={markLearned}
                  disabled={busy || data.learnedToday}
                >
                  <Icon name="check-circle" />
                  {data.learnedToday ? 'Learned today' : 'Mark as Learned'}
                </Button>

                <div className="mt-4 rounded-xl p-4 bg-card border border-border text-left">
                  <div className="flex items-center gap-4">
                    <div className="text-h2" aria-hidden="true">
                      <Icon name="fire" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Your Learning Streak</h4>
                      <div className="text-muted-foreground">
                        Current streak:{' '}
                        <span className="font-bold">
                          {data.streakDays} {data.streakDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Value at launch: <span className="font-bold">${(data.streakValueUSD ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert variant="info" className="mt-4">
                  Maintain your streak! Your days convert into credits at launch.
                </Alert>
              </>
            ) : null}
          </Card>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button href="/waitlist" variant="primary" className="w-full sm:w-auto">
              Join Exclusive Waitlist
            </Button>
            <Button href="/pricing" variant="secondary" className="w-full sm:w-auto">
              See Plans
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Hero;