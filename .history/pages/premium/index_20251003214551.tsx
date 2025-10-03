// pages/premium/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ThemeSwitcherPremium } from '@/premium-ui/theme/ThemeSwitcher';
import { PrCard } from '@/premium-ui/components/PrCard';
import { PrButton } from '@/premium-ui/components/PrButton';
import { supabase } from '@/lib/supabaseClient';
import {
  Headphones,
  BookOpenText,
  PenSquare,
  Mic,
  Trophy,
  Activity,
  Clock,
  ShieldCheck,
  Lock,
} from 'lucide-react';

type StatusResp = {
  pinOk: boolean;
  loggedIn: boolean;
  userId: string | null;
  plan: string | null;
};

type StreakData = {
  current_streak: number;
  last_activity_date: string | null;
  next_restart_date: string | null;
  shields: number;
};

// ---- hooks ----
function useAccessToken() {
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const pull = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setToken(data.session?.access_token ?? null);
    };

    pull();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return token;
}

function usePremiumStatus(token: string | null) {
  const [data, setData] = React.useState<StatusResp | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/premium/status', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: ctrl.signal,
        });
        const json: StatusResp = await res.json();
        if (mounted) setData(json);
      } catch {
        if (mounted) setData({ pinOk: false, loggedIn: false, userId: null, plan: null });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [token]);

  return { data, loading };
}

function useStreak(token: string | null) {
  const [data, setData] = React.useState<StreakData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/streak', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error('streak-error');
        const json: StreakData = await res.json();
        if (mounted) setData(json);
      } catch {
        if (mounted)
          setData({
            current_streak: 0,
            last_activity_date: null,
            next_restart_date: null,
            shields: 0,
          });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [token]);

  return { data, loading };
}

// ---- page ----
export default function PremiumHome() {
  const router = useRouter();
  const token = useAccessToken();
  const { data: status, loading: statusLoading } = usePremiumStatus(token);
  const { data: streak, loading: streakLoading } = useStreak(token);

  const plan = status?.plan ?? null;
  const isPremiumPlan = plan === 'premium' || plan === 'master';

  return (
    <>
      <Head>
        <title>Premium Exam Room</title>
        {/* Safe even if you also load this globally in _app.tsx */}
        <link rel="preload" href="/premium.css" as="style" />
        <link rel="stylesheet" href="/premium.css" />
      </Head>

      {/* Compact theme switcher in the corner */}
      <div className="pr-absolute pr-top-4 pr-right-4 pr-z-10">
        <ThemeSwitcherPremium />
      </div>

      <main className="pr-relative pr-mx-auto pr-max-w-[1200px] pr-p-6 pr-space-y-6">
        {/* Header */}
        <header className="pr-space-y-1">
          <h1 className="pr-text-h2 pr-font-semibold">Premium Exam Room</h1>
          <p className="pr-muted pr-text-small">Distraction-free IELTS practice with strict timing.</p>
        </header>

        {/* Status strip */}
        <section className="pr-grid md:pr-grid-cols-3 pr-gap-3">
          <PrCard className="pr-p-4 pr-flex pr-items-center pr-justify-between">
            <div className="pr-flex pr-items-center pr-gap-3">
              <ShieldCheck className="pr-w-5 pr-h-5" aria-hidden />
              <div>
                <p className="pr-text-small pr-muted">PIN Status</p>
                <p className="pr-font-medium">
                  {statusLoading ? 'Checking…' : status?.pinOk ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
            {status?.pinOk ? <span className="pr-badge pr-badge-success">OK</span> : <Lock className="pr-w-5 pr-h-5" />}
          </PrCard>

          <PrCard className="pr-p-4 pr-flex pr-items-center pr-justify-between">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Trophy className="pr-w-5 pr-h-5" aria-hidden />
              <div>
                <p className="pr-text-small pr-muted">Membership</p>
                <p className="pr-font-medium">
                  {statusLoading ? 'Loading…' : plan ? plan.toUpperCase() : 'Unknown'}
                </p>
              </div>
            </div>
            {isPremiumPlan ? (
              <span className="pr-badge pr-badge-primary">Premium</span>
            ) : (
              <Link href="/pricing" className="pr-link pr-text-small">
                Upgrade
              </Link>
            )}
          </PrCard>

          <PrCard className="pr-p-4 pr-flex pr-items-center pr-justify-between">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Activity className="pr-w-5 pr-h-5" aria-hidden />
              <div>
                <p className="pr-text-small pr-muted">Account</p>
                <p className="pr-font-medium">
                  {statusLoading
                    ? 'Loading…'
                    : status?.loggedIn
                    ? `Signed in • ${status.userId?.slice(0, 6)}…`
                    : 'Guest'}
                </p>
              </div>
            </div>
            <div className="pr-flex pr-gap-2">
              {status?.loggedIn ? (
                <Link href="/account" className="pr-link pr-text-small">
                  Manage
                </Link>
              ) : (
                <Link href="/login?next=/premium" className="pr-link pr-text-small">
                  Sign In
                </Link>
              )}
            </div>
          </PrCard>
        </section>

        {/* Streak + Quick actions */}
        <section className="pr-grid md:pr-grid-cols-3 pr-gap-6">
          <PrCard className="pr-p-6 pr-flex pr-flex-col pr-justify-between">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Clock className="pr-w-5 pr-h-5" aria-hidden />
              <h2 className="pr-text-h5 pr-font-semibold">Your Streak</h2>
            </div>
            <div className="pr-mt-4 pr-flex pr-items-end pr-justify-between">
              <div>
                <p className="pr-text-5xl pr-font-semibold">
                  {streakLoading ? '—' : streak?.current_streak ?? 0}
                </p>
                <p className="pr-muted pr-text-small pr-mt-1">
                  {streak?.last_activity_date ? `Last: ${streak.last_activity_date}` : 'No activity yet'}
                </p>
              </div>
              <div className="pr-text-right">
                <p className="pr-muted pr-text-small">24-hour window</p>
                <p className="pr-text-small">Complete one activity daily to grow streak.</p>
              </div>
            </div>
            <div className="pr-mt-6 pr-flex pr-gap-3">
              <PrButton onClick={() => router.push('/premium/listening/sample-test')}>
                Log Today (Listening)
              </PrButton>
              <Link href="/study-plan" className="pr-link pr-text-small pr-self-center">
                View Study Plan
              </Link>
            </div>
          </PrCard>

          <PrCard className="pr-p-6 pr-flex pr-flex-col">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Activity className="pr-w-5 pr-h-5" aria-hidden />
              <h2 className="pr-text-h5 pr-font-semibold">Quick Actions</h2>
            </div>
            <div className="pr-mt-4 pr-grid pr-gap-3">
              <PrButton variant="secondary" onClick={() => router.push('/premium/reading/sample-test')}>
                Resume / Start Reading
              </PrButton>
              <PrButton variant="secondary" onClick={() => router.push('/premium/writing/sample-task')}>
                Start Writing Task
              </PrButton>
              <PrButton variant="secondary" onClick={() => router.push('/premium/speaking/mock')}>
                Start Speaking Mock
              </PrButton>
            </div>
            <p className="pr-muted pr-text-small pr-mt-3">
              Strict timers, autosave, and result analytics included.
            </p>
          </PrCard>

          <PrCard className="pr-p-6 pr-flex pr-flex-col">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Trophy className="pr-w-5 pr-h-5" aria-hidden />
              <h2 className="pr-text-h5 pr-font-semibold">Goals</h2>
            </div>
            <p className="pr-muted pr-mt-2">
              Track your band trajectory and skill gaps as you complete tests.
            </p>
            <div className="pr-mt-4 pr-flex pr-gap-3">
              <Link href="/progress" className="pr-link pr-text-small">
                View Progress
              </Link>
              <Link href="/reports" className="pr-link pr-text-small">
                Open Reports
              </Link>
            </div>
          </PrCard>
        </section>

        {/* IELTS modules */}
        <section className="pr-space-y-3">
          <div className="pr-flex pr-items-center pr-justify-between">
            <h2 className="pr-text-h5 pr-font-semibold">IELTS Modules</h2>
            <Link href="/study-plan" className="pr-link pr-text-small">
              See all practice
            </Link>
          </div>

          <div className="pr-grid md:pr-grid-cols-4 pr-gap-6">
            <PrCard className="pr-p-6 pr-flex pr-flex-col pr-gap-3">
              <div className="pr-flex pr-items-center pr-gap-2">
                <Headphones className="pr-w-5 pr-h-5" aria-hidden />
                <h3 className="pr-font-medium">Listening</h3>
              </div>
              <p className="pr-muted pr-text-small">Audio sections, strict timers, autosubmit.</p>
              <div className="pr-flex pr-gap-2 pr-mt-auto">
                <Link href="/premium/listening/sample-test" className="pr-link pr-text-small">
                  Start test
                </Link>
                <Link href="/listening" className="pr-link pr-text-small">
                  Practice
                </Link>
              </div>
            </PrCard>

            <PrCard className="pr-p-6 pr-flex pr-flex-col pr-gap-3">
              <div className="pr-flex pr-items-center pr-gap-2">
                <BookOpenText className="pr-w-5 pr-h-5" aria-hidden />
                <h3 className="pr-font-medium">Reading</h3>
              </div>
              <p className="pr-muted pr-text-small">Passages, flags, answer grid, review.</p>
              <div className="pr-flex pr-gap-2 pr-mt-auto">
                <Link href="/premium/reading/sample-test" className="pr-link pr-text-small">
                  Start test
                </Link>
                <Link href="/reading" className="pr-link pr-text-small">
                  Practice
                </Link>
              </div>
            </PrCard>

            <PrCard className="pr-p-6 pr-flex pr-flex-col pr-gap-3">
              <div className="pr-flex pr-items-center pr-gap-2">
                <PenSquare className="pr-w-5 pr-h-5" aria-hidden />
                <h3 className="pr-font-medium">Writing</h3>
              </div>
              <p className="pr-muted pr-text-small">Task 1/2 prompts, AI marking, band tips.</p>
              <div className="pr-flex pr-gap-2 pr-mt-auto">
                <Link href="/premium/writing/sample-task" className="pr-link pr-text-small">
                  Start task
                </Link>
                <Link href="/writing" className="pr-link pr-text-small">
                  Practice
                </Link>
              </div>
            </PrCard>

            <PrCard className="pr-p-6 pr-flex pr-flex-col pr-gap-3">
              <div className="pr-flex pr-items-center pr-gap-2">
                <Mic className="pr-w-5 pr-h-5" aria-hidden />
                <h3 className="pr-font-medium">Speaking</h3>
              </div>
              <p className="pr-muted pr-text-small">Cue cards, recording, instant feedback.</p>
              <div className="pr-flex pr-gap-2 pr-mt-auto">
                <Link href="/premium/speaking/mock" className="pr-link pr-text-small">
                  Start mock
                </Link>
                <Link href="/speaking" className="pr-link pr-text-small">
                  Practice
                </Link>
              </div>
            </PrCard>
          </div>
        </section>

        {/* Help / Shortcuts */}
        <section className="pr-grid md:pr-grid-cols-2 pr-gap-6">
          <PrCard className="pr-p-6 pr-flex pr-flex-col pr-gap-3">
            <h2 className="pr-text-h5 pr-font-semibold">Shortcuts</h2>
            <div className="pr-grid pr-grid-cols-2 pr-gap-2">
              <Link href="/progress" className="pr-link pr-text-small">
                Band Progress
              </Link>
              <Link href="/reports" className="pr-link pr-text-small">
                Reports
              </Link>
              <Link href="/study-plan" className="pr-link pr-text-small">
                Study Plan
              </Link>
              <Link href="/mock" className="pr-link pr-text-small">
                Mock Tests
              </Link>
            </div>
          </PrCard>

          <PrCard className="pr-p-6 pr-flex pr-items-center pr-justify-between">
            <div>
              <h2 className="pr-text-h5 pr-font-semibold">Need help?</h2>
              <p className="pr-muted pr-text-small pr-mt-1">
                Having trouble with Premium access or tests?
              </p>
            </div>
            <Link href="/support" className="pr-link pr-text-small">
              Contact Support
            </Link>
          </PrCard>
        </section>
      </main>
    </>
  );
}
