'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { Icon } from '@/components/design-system/Icon';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser
import { track } from '@/lib/analytics/track';
import { LaunchCountdown } from '@/components/launch/LaunchCountdown';

const highlightFeatures = [
  {
    icon: 'Target',
    label: 'Adaptive study plan',
    description: 'Daily lessons flex to your target band.',
  },
  {
    icon: 'Sparkles',
    label: 'Real exam simulation',
    description: 'Timed mocks with instant AI scoring.',
  },
  {
    icon: 'Heart',
    label: 'Human & AI coaching',
    description: 'Mentors + AI reply fast to keep you moving.',
  },
] as const;

type WOD = {
  word: { id: string; word: string; meaning: string; example: string | null };
  learnedToday: boolean;
  streakDays: number;
  streakValueUSD: number;
};

export type HeroProps = {
  onStreakChange?: (n: number) => void;
  streak?: number;
  serverNowMsUTC: number;
  launchMsUTC: number;
};

export const Hero: React.FC<HeroProps> = ({ onStreakChange, serverNowMsUTC, launchMsUTC }) => {
  const [data, setData] = useState<WOD | null>(null);
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<'unknown' | 'authed' | 'guest'>('unknown');

  const load = useCallback(async (): Promise<WOD | null> => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
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
      if (!json.learnedToday) {
        track('vocab_review_start', { wordId: json.word.id });
      }
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
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
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
        track('vocab_review_finish', { wordId: data.word.id });
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
    <section className="relative overflow-hidden bg-gradient-to-b from-surface via-lightBg to-white/40 dark:from-dark/95 dark:via-dark/80 dark:to-dark/90">
      <div className="absolute inset-x-0 top-[-12rem] z-0 flex justify-center blur-3xl">
        <div className="h-[28rem] w-[32rem] rounded-full bg-gradient-to-br from-electricBlue/40 via-purpleVibe/30 to-neonGreen/40 opacity-80" />
      </div>
      <Container className="relative z-10 pb-20 pt-28 md:pt-32 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-electricBlue/30 bg-white/80 px-4 py-1 text-sm font-medium text-electricBlue shadow-sm backdrop-blur dark:bg-dark/40">
              <Icon name="Sparkles" className="text-electricBlue" />
              Built with IELTS experts & AI
            </div>
            <h1 className="mt-6 font-slab text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
              <span className="text-gradient-primary">Your personalized IELTS launchpad</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              See your starting band, follow a daily plan, and stay on pace for test day.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {highlightFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-start gap-4 rounded-2xl border border-border/60 bg-white/60 p-5 shadow-sm backdrop-blur dark:bg-dark/60"
                >
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-electricBlue to-purpleVibe text-white">
                    <Icon name={feature.icon} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{feature.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button href="/waitlist" variant="primary" className="w-full sm:w-auto">
                Start free with the waitlist
              </Button>
              <Button href="/pricing" variant="ghost" className="w-full sm:w-auto border border-border/60">
                Explore premium plans
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Icon name="Users" className="text-electricBlue" />
                18k+ learners
              </div>
              <div className="flex items-center gap-2">
                <Icon name="ShieldCheck" className="text-purpleVibe" />
                CEFR aligned
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Calendar" className="text-neonGreen" />
                Daily rituals
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border border-electricBlue/30 bg-white/80 p-6 shadow-lg backdrop-blur dark:bg-dark/70">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-electricBlue">
                <span className="uppercase tracking-wide">Beta access</span>
                <span className="rounded-full bg-electricBlue/10 px-3 py-1 text-electricBlue">Opens in</span>
              </div>
              <LaunchCountdown serverNowMsUTC={serverNowMsUTC} launchMsUTC={launchMsUTC} />
            </Card>

            <Card className="border border-border/60 bg-white/80 p-6 shadow-lg backdrop-blur dark:bg-dark/70">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  <Icon name="Book" /> Word of the day
                </h3>
                {auth === 'guest' ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-electricBlue">Sign in for streaks</span>
                ) : null}
              </div>

              {auth === 'guest' && (
                <Alert variant="info" className="mb-4">
                  Sign in to track streaks and rewards.
                </Alert>
              )}

              {data ? (
                <>
                  <div className="mb-4">
                    <h4 className="text-3xl font-semibold text-electricBlue">{data.word.word}</h4>
                    <div className="mt-2 text-sm text-muted-foreground">{data.word.meaning}</div>
                    {data.word.example && (
                      <div className="mt-3 border-l-2 border-electricBlue/30 pl-3 text-sm italic text-muted-foreground">
                        “{data.word.example}”
                      </div>
                    )}
                  </div>

                  <Button
                    variant={data.learnedToday ? 'secondary' : 'accent'}
                    onClick={markLearned}
                    disabled={busy || data.learnedToday}
                    className="w-full"
                  >
                    <Icon name="CheckCircle" />
                    {data.learnedToday ? 'Learned today' : 'Mark as learned'}
                  </Button>

                  <div className="mt-4 rounded-xl border border-border/60 bg-card/60 p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl text-neonGreen" aria-hidden="true">
                        <Icon name="Flame" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Your learning streak</p>
                        <p className="text-sm text-muted-foreground">
                          Current streak{' '}
                          <span className="font-semibold text-foreground">
                            {data.streakDays} {data.streakDays === 1 ? 'day' : 'days'}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Launch credits:{' '}
                          <span className="font-semibold text-foreground">${(data.streakValueUSD ?? 0).toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    <Alert variant="info" className="mt-3">
                      Keep the streak alive to grow your launch credit.
                    </Alert>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading today&rsquo;s challenge…</div>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Hero;
