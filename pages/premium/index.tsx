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
  ShieldCheck,
  Lock,
  Trophy,
  Activity,
  Clock,
  Headphones,
  BookOpenText,
  PenSquare,
  Mic,
  ArrowRight,
} from 'lucide-react';

/* ----------------------------- types ----------------------------- */
type StatusResp = {
  pinOk: boolean;
  loggedIn: boolean;
  userId: string | null;
  plan: 'free' | 'premium' | 'master' | null;
};

/* ----------------------------- hooks ----------------------------- */
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

/* ----------------------------- page ----------------------------- */
export default function PremiumHome() {
  const router = useRouter();
  const token = useAccessToken();
  const { data: status, loading } = usePremiumStatus(token);

  const plan = status?.plan ?? null;
  const isPremiumPlan = plan === 'premium' || plan === 'master';

  return (
    <>
      <Head>
        <title>Premium Exam Room</title>
        {/* Safe even if also loaded globally */}
        <link rel="preload" href="/premium.css" as="style" />
        <link rel="stylesheet" href="/premium.css" />
      </Head>

      {/* compact theme switcher */}
      <div className="pr-absolute pr-top-4 pr-right-4 pr-z-10">
        <ThemeSwitcherPremium />
      </div>

      <main className="pr-relative pr-mx-auto pr-max-w-[1100px] pr-p-6 pr-space-y-8">
        {/* Hero */}
        <header className="pr-text-center pr-space-y-2">
          <h1 className="pr-text-h2 pr-font-semibold">Premium Exam Room</h1>
          <p className="pr-muted pr-text-small">
            Distraction-free IELTS practice with strict timing.
          </p>
        </header>

        {/* Tiny status chips: minimal but informative */}
        <section className="pr-grid md:pr-grid-cols-3 pr-gap-3">
          <PrCard className="pr-p-4 pr-flex pr-items-center pr-justify-between">
            <div className="pr-flex pr-items-center pr-gap-3">
              <ShieldCheck className="pr-w-5 pr-h-5" aria-hidden />
              <div>
                <p className="pr-text-small pr-muted">PIN</p>
                <p className="pr-font-medium">
                  {loading ? 'Checking…' : status?.pinOk ? 'Verified' : 'Locked'}
                </p>
              </div>
            </div>
            {status?.pinOk ? (
              <span className="pr-badge pr-badge-success">OK</span>
            ) : (
              <Lock className="pr-w-5 pr-h-5" aria-hidden />
            )}
          </PrCard>

          <PrCard className="pr-p-4 pr-flex pr-items-center pr-justify-between">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Trophy className="pr-w-5 pr-h-5" aria-hidden />
              <div>
                <p className="pr-text-small pr-muted">Membership</p>
                <p className="pr-font-medium">
                  {loading ? 'Loading…' : plan ? plan.toUpperCase() : 'FREE'}
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
                  {loading
                    ? 'Loading…'
                    : status?.loggedIn
                    ? `Signed in • ${status.userId?.slice(0, 6)}…`
                    : 'Guest'}
                </p>
              </div>
            </div>
            {status?.loggedIn ? (
              <Link href="/account" className="pr-link pr-text-small">
                Manage
              </Link>
            ) : (
              <Link href="/login?next=/premium" className="pr-link pr-text-small">
                Sign In
              </Link>
            )}
          </PrCard>
        </section>

        {/* Two big, beautiful actions */}
        <section className="pr-grid md:pr-grid-cols-2 pr-gap-6">
          {/* Start a timed test */}
          <PrCard className="pr-p-8 pr-flex pr-flex-col pr-justify-between pr-min-h-[240px]">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Clock className="pr-w-5 pr-h-5" aria-hidden />
              <h2 className="pr-text-h5 pr-font-semibold">Start a Timed Test</h2>
            </div>

            <div className="pr-mt-6 pr-grid pr-gap-3">
              <PrButton onClick={() => router.push('/premium/listening/sample-test')}>
                <span className="pr-inline-flex pr-items-center pr-gap-2">
                  <Headphones className="pr-w-4 pr-h-4" />
                  Listening Test
                </span>
              </PrButton>
              <PrButton variant="secondary" onClick={() => router.push('/premium/reading/sample-test')}>
                <span className="pr-inline-flex pr-items-center pr-gap-2">
                  <BookOpenText className="pr-w-4 pr-h-4" />
                  Reading Test
                </span>
              </PrButton>
            </div>

            <p className="pr-muted pr-text-small pr-mt-4">
              Strict timers • autosave • clean layout.
            </p>
          </PrCard>

          {/* Practice by module */}
          <PrCard className="pr-p-8 pr-flex pr-flex-col pr-justify-between pr-min-h-[240px]">
            <div className="pr-flex pr-items-center pr-gap-3">
              <Activity className="pr-w-5 pr-h-5" aria-hidden />
              <h2 className="pr-text-h5 pr-font-semibold">Practice by Module</h2>
            </div>

            <div className="pr-mt-6 pr-grid pr-grid-cols-2 pr-gap-3">
              <Link href="/listening" className="pr-link pr-text-small pr-inline-flex pr-items-center pr-gap-2">
                <Headphones className="pr-w-4 pr-h-4" /> Listening
              </Link>
              <Link href="/reading" className="pr-link pr-text-small pr-inline-flex pr-items-center pr-gap-2">
                <BookOpenText className="pr-w-4 pr-h-4" /> Reading
              </Link>
              <Link href="/writing" className="pr-link pr-text-small pr-inline-flex pr-items-center pr-gap-2">
                <PenSquare className="pr-w-4 pr-h-4" /> Writing
              </Link>
              <Link href="/speaking" className="pr-link pr-text-small pr-inline-flex pr-items-center pr-gap-2">
                <Mic className="pr-w-4 pr-h-4" /> Speaking
              </Link>
            </div>

            <div className="pr-mt-4 pr-inline-flex pr-items-center pr-gap-2 pr-text-small">
              <span className="pr-muted">View full plan</span>
              <ArrowRight className="pr-w-4 pr-h-4" aria-hidden />
              <Link href="/study-plan" className="pr-link pr-text-small">
                Study Plan
              </Link>
            </div>
          </PrCard>
        </section>
      </main>
    </>
  );
}
